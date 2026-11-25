import { ThinkingLevel, Type } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import {
  ConfidenceLevel,
  DocumentType,
  ExtractedRow,
  ExtractionMethod,
} from '../src/shared/clinicalTypes.ts';
import { getGeminiClient } from './geminiClient.ts';
import { parseNumericValue } from './ruleEngine.ts';

export interface ExtractionOutput {
  extraction_method: ExtractionMethod;
  document_type_hint: DocumentType;
  raw_text: string;
  rows: ExtractedRow[];
  illegible_notes: string[];
  extraction_confidence: ConfidenceLevel;
}

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    document_type: {
      type: Type.STRING,
      enum: ['lab_report', 'prescription', 'clinical_note', 'mixed', 'unknown'],
    },
    transcribed_text: {
      type: Type.STRING,
      description: 'Verbatim text transcribed or preserved from the document.',
    },
    extraction_confidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    illegible_notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List any blurred, cut-off, ambiguous, or unreadable portions.',
    },
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          test_name: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          reference_range: { type: Type.STRING },
          flag_in_doc: { type: Type.STRING },
          page: { type: Type.INTEGER },
          source_text: {
            type: Type.STRING,
            description: 'Exact verbatim line or span from the document supporting this row.',
          },
        },
        required: ['test_name', 'value', 'unit', 'reference_range', 'page', 'source_text'],
      },
    },
  },
  required: [
    'document_type',
    'transcribed_text',
    'extraction_confidence',
    'illegible_notes',
    'rows',
  ],
};

function deterministicLineParser(rawText: string): ExtractedRow[] {
  const rows: ExtractedRow[] = [];
  const lines = rawText.split(/\r?\n/);
  let currentPage = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---$/i) || line.match(/^Page\s+(\d+)\b/i);
    if (pageMatch) {
      currentPage = Number(pageMatch[1]) || currentPage;
      continue;
    }

    // Match structured lines like:
    // "Potassium: 6.4 mmol/L (Ref: 3.5 - 5.0) [CRITICAL HIGH]"
    // "Hemoglobin    11.2    g/dL    12.0 - 16.0    L"
    // "Glucose, Fasting: 142 mg/dL | Reference: 70-99 | Flag: H"
    const pipeOrTab = line.split(/\t+|\s{2,}|\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    if (pipeOrTab.length >= 2) {
      const candidateName = pipeOrTab[0].replace(/:$/, '').trim();
      const rest = pipeOrTab.slice(1).join(' ');
      const valMatch = rest.match(
        /^([<>≤≥]?\s*-?\d+(?:,\d{3})*(?:\.\d+)?)\s*([a-zA-Z%/^0-9µu·]+)?/
      );
      if (
        candidateName.length >= 2 &&
        candidateName.length <= 60 &&
        !/^(date|patient|dob|mrn|doctor|physician|clinic|hospital|report|specimen|page|test\s*name|result)/i.test(
          candidateName
        ) &&
        valMatch
      ) {
        const valueStr = valMatch[1].trim();
        const unitStr = (valMatch[2] ?? '').trim();
        const rangeMatch = line.match(
          /(?:ref(?:erence)?(?:\s*range)?\s*[:=]?\s*)?([<>≤≥]?\s*\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?|[<>≤≥]\s*\d+(?:\.\d+)?)/i
        );
        const flagMatch = line.match(
          /\b(CRITICAL(?:\s+HIGH|\s+LOW)?|PANIC\s*VALUE|STAT|HIGH|LOW|ABNORMAL|HH|LL|H|L)\b/i
        );
        rows.push({
          id: `row_${rows.length + 1}`,
          test_name: candidateName,
          value: valueStr,
          numeric_value: parseNumericValue(valueStr),
          unit: unitStr,
          reference_range: rangeMatch ? rangeMatch[1].trim() : '',
          flag_in_doc: flagMatch ? flagMatch[1].trim() : null,
          page: currentPage,
          source_text: line,
        });
        continue;
      }
    }

    // Colon-separated inline format: "Potassium: 6.4 mmol/L (3.5-5.0) CRITICAL"
    const colonMatch = line.match(
      /^([A-Za-z0-9\s,()\-/+]{2,55}):\s*([<>≤≥]?\s*-?\d+(?:,\d{3})*(?:\.\d+)?)\s*([a-zA-Z%/^0-9µu]+)?(.*)$/
    );
    if (colonMatch) {
      const testName = colonMatch[1].trim();
      if (
        !/^(date|time|age|phone|fax|id|mrn|dob|page|rx|sig|qty|refills|license|dea)/i.test(
          testName
        )
      ) {
        const valueStr = colonMatch[2].trim();
        const unitStr = (colonMatch[3] ?? '').trim();
        const tail = colonMatch[4] ?? '';
        const rangeMatch = tail.match(
          /(\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?|[<>≤≥]\s*\d+(?:\.\d+)?)/i
        );
        const flagMatch = tail.match(
          /\b(CRITICAL(?:\s+HIGH|\s+LOW)?|PANIC\s*VALUE|STAT|HIGH|LOW|ABNORMAL|HH|LL|H|L)\b/i
        );
        rows.push({
          id: `row_${rows.length + 1}`,
          test_name: testName,
          value: valueStr,
          numeric_value: parseNumericValue(valueStr),
          unit: unitStr,
          reference_range: rangeMatch ? rangeMatch[1].trim() : '',
          flag_in_doc: flagMatch ? flagMatch[1].trim() : null,
          page: currentPage,
          source_text: line,
        });
      }
    }
  }

  return rows;
}

function inferDocType(rawText: string, rowsCount: number): DocumentType {
  const hasRx = /\b(mg|mcg|tablet|capsule|sig:|take\s+\d+|twice\s+daily|once\s+daily|refill|rx|prescription)\b/i.test(
    rawText
  );
  if (rowsCount > 0 && hasRx) return 'mixed';
  if (rowsCount > 0) return 'lab_report';
  if (hasRx) return 'prescription';
  if (rawText.trim().length > 20) return 'clinical_note';
  return 'unknown';
}

async function extractWithGeminiStructured(params: {
  rawText?: string;
  inlineFile?: { mimeType: string; base64: string };
}): Promise<{
  document_type: DocumentType;
  transcribed_text: string;
  extraction_confidence: ConfidenceLevel;
  illegible_notes: string[];
  rows: ExtractedRow[];
}> {
  const ai = getGeminiClient();

  const promptText = `You are a clinical document extraction engine.
Your ONLY job is to accurately transcribe and normalize structured lab/vital rows from the provided medical document WITHOUT inventing or guessing any numbers, units, or reference ranges.

Rules:
1. Extract every lab result, vital sign, or quantitative clinical measurement into "rows".
2. Copy "value", "unit", "reference_range", "flag_in_doc", and "source_text" VERBATIM from the document.
3. If a reference range is not printed in the document for a test, set "reference_range" to "".
4. If any portion is blurry, cut off, handwritten/illegible, or ambiguous, DO NOT GUESS. Record what is unreadable in "illegible_notes" and set "extraction_confidence" to "low" or "medium".
5. If this is primarily a prescription or narrative clinical note with few or no lab rows, return "rows": [] and preserve the full text in "transcribed_text".`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (params.inlineFile) {
    parts.push({
      inlineData: {
        mimeType: params.inlineFile.mimeType,
        data: params.inlineFile.base64,
      },
    });
  }
  if (params.rawText) {
    parts.push({ text: `${promptText}\n\nDOCUMENT TEXT:\n${params.rawText}` });
  } else {
    parts.push({ text: promptText });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    document_type?: DocumentType;
    transcribed_text?: string;
    extraction_confidence?: ConfidenceLevel;
    illegible_notes?: string[];
    rows?: Array<{
      test_name: string;
      value: string;
      unit: string;
      reference_range: string;
      flag_in_doc?: string;
      page: number;
      source_text: string;
    }>;
  };

  const rows: ExtractedRow[] = (parsed.rows ?? []).map((r, idx) => ({
    id: `row_${idx + 1}`,
    test_name: String(r.test_name ?? '').trim(),
    value: String(r.value ?? '').trim(),
    numeric_value: parseNumericValue(String(r.value ?? '')),
    unit: String(r.unit ?? '').trim(),
    reference_range: String(r.reference_range ?? '').trim(),
    flag_in_doc: r.flag_in_doc ? String(r.flag_in_doc).trim() : null,
    page: Number(r.page) || 1,
    source_text: String(r.source_text ?? '').trim(),
  }));

  return {
    document_type: parsed.document_type ?? 'unknown',
    transcribed_text: parsed.transcribed_text ?? params.rawText ?? '',
    extraction_confidence: parsed.extraction_confidence ?? 'medium',
    illegible_notes: Array.isArray(parsed.illegible_notes) ? parsed.illegible_notes : [],
    rows,
  };
}

export async function extractDocument(input: {
  fileBuffer?: Buffer;
  mimeType?: string;
  rawText?: string;
}): Promise<ExtractionOutput> {
  // 1. Pasted text or plain-text file
  if (input.rawText && !input.fileBuffer) {
    const cleanText = input.rawText.trim();
    const deterministicRows = deterministicLineParser(cleanText);

    // If deterministic parser finds clean rows, verify or supplement with Gemini structured extraction
    // only when deterministic parser found 0 rows and text looks substantial
    if (deterministicRows.length >= 2) {
      return {
        extraction_method: 'raw_text',
        document_type_hint: inferDocType(cleanText, deterministicRows.length),
        raw_text: cleanText,
        rows: deterministicRows,
        illegible_notes: [],
        extraction_confidence: 'high',
      };
    }

    const structured = await extractWithGeminiStructured({ rawText: cleanText });
    const mergedRows = structured.rows.length > 0 ? structured.rows : deterministicRows;
    return {
      extraction_method: 'raw_text',
      document_type_hint: structured.document_type,
      raw_text: cleanText,
      rows: mergedRows,
      illegible_notes: structured.illegible_notes,
      extraction_confidence: structured.extraction_confidence,
    };
  }

  // 2. Uploaded PDF
  if (input.fileBuffer && input.mimeType === 'application/pdf') {
    let extractedPdfText = '';
    try {
      const parser = new PDFParse({ data: new Uint8Array(input.fileBuffer) });
      const textResult = await parser.getText();
      extractedPdfText = (textResult.text ?? '').trim();
      await parser.destroy();
    } catch {
      extractedPdfText = '';
    }

    // If PDF contains selectable text, parse deterministically + normalize via Gemini if needed
    if (extractedPdfText.length >= 40) {
      const deterministicRows = deterministicLineParser(extractedPdfText);
      if (deterministicRows.length >= 2) {
        return {
          extraction_method: 'pdf_text',
          document_type_hint: inferDocType(extractedPdfText, deterministicRows.length),
          raw_text: extractedPdfText,
          rows: deterministicRows,
          illegible_notes: [],
          extraction_confidence: 'high',
        };
      }

      const structured = await extractWithGeminiStructured({ rawText: extractedPdfText });
      return {
        extraction_method: 'pdf_text',
        document_type_hint: structured.document_type,
        raw_text: extractedPdfText,
        rows: structured.rows.length > 0 ? structured.rows : deterministicRows,
        illegible_notes: structured.illegible_notes,
        extraction_confidence: structured.extraction_confidence,
      };
    }

    // Scanned/image-based PDF fallback via Gemini multimodal vision
    const base64Pdf = input.fileBuffer.toString('base64');
    const visionResult = await extractWithGeminiStructured({
      inlineFile: { mimeType: 'application/pdf', base64: base64Pdf },
    });
    return {
      extraction_method: 'multimodal_vision',
      document_type_hint: visionResult.document_type,
      raw_text: visionResult.transcribed_text,
      rows: visionResult.rows,
      illegible_notes: visionResult.illegible_notes,
      extraction_confidence: visionResult.extraction_confidence,
    };
  }

  // 3. Uploaded image (JPG / PNG)
  if (input.fileBuffer && input.mimeType) {
    const base64Img = input.fileBuffer.toString('base64');
    const visionResult = await extractWithGeminiStructured({
      inlineFile: { mimeType: input.mimeType, base64: base64Img },
    });
    return {
      extraction_method: 'multimodal_vision',
      document_type_hint: visionResult.document_type,
      raw_text: visionResult.transcribed_text,
      rows: visionResult.rows,
      illegible_notes: visionResult.illegible_notes,
      extraction_confidence: visionResult.extraction_confidence,
    };
  }

  throw new Error('No readable text or supported file (PDF, JPG, PNG) was provided.');
}
