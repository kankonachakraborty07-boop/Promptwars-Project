import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { extractDocument } from './server/extractor.ts';
import { interpretWithSafetyValidation } from './server/geminiInterpreter.ts';
import { evaluateAllRows, scanRawTextForUrgentSignals } from './server/ruleEngine.ts';

const PORT = Number(process.env.PORT) || 3000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, JPG, PNG, or TXT document.'));
    }
  },
});

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'MediMind Clinical Interpreter',
      stateless: true,
    });
  });

  app.post('/api/analyze', (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      upload.single('file')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File exceeds the 10 MB size limit.' });
            return;
          }
          res.status(400).json({ error: err.message || 'Invalid file upload.' });
          return;
        }
        next();
      });
    } else {
      next();
    }
  }, async (req: Request, res: Response) => {
    try {
      const uploadedFile = req.file;
      const bodyText =
        typeof req.body?.text === 'string' ? req.body.text.trim() : '';

      if (!uploadedFile && !bodyText) {
        res.status(400).json({
          error: 'Please upload a medical report (PDF, JPG, PNG) or paste report text.',
        });
        return;
      }

      if (bodyText && bodyText.length < 12 && !uploadedFile) {
        res.status(400).json({
          error: 'The pasted text is too short to interpret safely. Please include full test lines or notes.',
        });
        return;
      }

      // 1. Extraction Layer (stateless, in-memory only, zero PII logged)
      const extracted = await extractDocument({
        fileBuffer: uploadedFile?.buffer,
        mimeType:
          uploadedFile?.mimetype === 'image/jpg' ? 'image/jpeg' : uploadedFile?.mimetype,
        rawText:
          uploadedFile?.mimetype === 'text/plain'
            ? uploadedFile.buffer.toString('utf-8')
            : bodyText || undefined,
      });

      if (!extracted.raw_text && extracted.rows.length === 0) {
        res.status(422).json({
          error:
            'No readable clinical text or lab rows could be extracted from this file. Try a clearer image or paste the report text directly.',
        });
        return;
      }

      // 2. Deterministic Rule Engine (never delegated to the LLM)
      const evaluatedRows = evaluateAllRows(extracted.rows);
      const rawUrgentReasons = scanRawTextForUrgentSignals(extracted.raw_text);

      // 3. LLM Interpretation + Safety Validator + Retry + Safe Fallback
      const analysis = await interpretWithSafetyValidation({
        evaluatedRows,
        rawText: extracted.raw_text,
        rawUrgentReasons,
        illegibleNotes: extracted.illegible_notes,
        extractionMethod: extracted.extraction_method,
        extractionConfidence: extracted.extraction_confidence,
        documentTypeHint: extracted.document_type_hint,
      });

      res.json(analysis);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unexpected server error during analysis.';
      // Surface actionable Gemini API / configuration errors cleanly without logging PII
      const status =
        message.includes('GEMINI_API_KEY') || message.includes('API_KEY_INVALID') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediMind clinical server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
