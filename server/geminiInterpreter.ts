import { ThinkingLevel, Type } from '@google/genai';
import {
  AnalysisResponse,
  ConfidenceLevel,
  DocumentType,
  ExtractionMethod,
  RuleEvaluatedRow,
} from '../src/shared/clinicalTypes.ts';
import { getGeminiClient } from './geminiClient.ts';
import {
  buildSafeFallbackResult,
  mergeValidatedResult,
  validateLlmOutput,
} from './validator.ts';

const SYSTEM_PROMPT = `You are MediMind, a patient-friendly clinical communication assistant aligned with NCPL Meditech's safety-first Emergency Response Optimization standards.

NON-NEGOTIABLE SAFETY RULES:
1. NEVER DIAGNOSE. Never say "you have X", "you are diagnosed with", "this confirms you have", or "you suffer from". Instead, ALWAYS use phrasing such as "this value is often looked at by doctors when assessing..." or "clinicians commonly review this marker alongside symptoms when evaluating...".
2. NEVER recommend starting, stopping, or changing a medication or dose. Never say "stop taking", "discontinue", "start taking", "increase your dose", or "decrease your dose". For prescriptions, explain the general educational purpose of the medication and advise discussing any questions with the prescribing clinician or pharmacist.
3. NEVER invent values, units, or reference ranges. Use ONLY the values and units present in the extracted rows and document text. If a reference range came from the built-in adult guide, refer to it as a "typical adult range (general guide)". If no range was provided, state "range not provided".
4. TRACEABILITY: Every explanation and medication/terminology entry MUST include a verbatim "source_quote" or "source_text" copied from the uploaded document.
5. UNCERTAINTY: If data is illegible, ambiguous, or missing, explicitly say so and set confidence to "low". Do not guess.
6. TIER-LOCK RULE: You receive deterministic rule-engine tiers (NORMAL, ABNORMAL, POTENTIALLY_URGENT). You MAY escalate a tier (e.g., ABNORMAL -> POTENTIALLY_URGENT) if combined clinical signals in the text warrant urgent same-day review, but you MUST NEVER downgrade a rule-engine POTENTIALLY_URGENT tier.
7. TONE & CLARITY: Write in calm, reassuring, plain everyday language (avoid alarmism while clearly communicating when prompt clinician review is warranted). Urgent never means a diagnosis; it means "get this reviewed promptly."`;

const INTERPRETATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    document_type: {
      type: Type.STRING,
      enum: ['lab_report', 'prescription', 'clinical_note', 'mixed', 'unknown'],
    },
    confidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    confidence_note: { type: Type.STRING },
    plain_summary: { type: Type.STRING },
    finding_explanations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          suggested_tier: {
            type: Type.STRING,
            enum: ['NORMAL', 'ABNORMAL', 'POTENTIALLY_URGENT'],
          },
          what_it_measures: { type: Type.STRING },
          plain_explanation: { type: Type.STRING },
          source_quote: { type: Type.STRING },
        },
        required: [
          'id',
          'suggested_tier',
          'what_it_measures',
          'plain_explanation',
          'source_quote',
        ],
      },
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage_in_doc: { type: Type.STRING },
          frequency_in_doc: { type: Type.STRING },
          plain_purpose: { type: Type.STRING },
          safety_note: { type: Type.STRING },
          source_text: { type: Type.STRING },
        },
        required: [
          'name',
          'dosage_in_doc',
          'frequency_in_doc',
          'plain_purpose',
          'safety_note',
          'source_text',
        ],
      },
    },
    terminology: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          plain_explanation: { type: Type.STRING },
          context_in_report: { type: Type.STRING },
          source_text: { type: Type.STRING },
        },
        required: ['term', 'plain_explanation', 'context_in_report', 'source_text'],
      },
    },
    doctor_questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    additional_urgent_reasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'document_type',
    'confidence',
    'confidence_note',
    'plain_summary',
    'finding_explanations',
    'medications',
    'terminology',
    'doctor_questions',
    'additional_urgent_reasons',
  ],
};

function buildPromptPayload(params: {
  evaluatedRows: RuleEvaluatedRow[];
  rawText: string;
  illegibleNotes: string[];
  documentTypeHint: DocumentType;
  repairViolations?: string[];
}): string {
  const compactRows = params.evaluatedRows.map((r) => ({
    id: r.id,
    test_name: r.test_name,
    value: r.value,
    unit: r.unit,
    reference_range_text: r.effective_range.text,
    range_source: r.range_source,
    flag_in_doc: r.flag_in_doc,
    preliminary_tier: r.preliminary_tier,
    severity_ratio: r.severity_ratio,
    critical_reason: r.critical_reason,
    page: r.page,
    source_text: r.source_text,
  }));

  const repairSection = params.repairViolations?.length
    ? `\n\nREPAIR REQUIRED — Your previous draft failed safety validation for these exact reasons:\n- ${params.repairViolations.join('\n- ')}\nFix every listed violation strictly. Do NOT use any diagnostic phrases or medication change directives, and ensure every finding ID and source quote matches the input.`
    : '';

  return `Interpret the following extracted medical document data for a patient.

DOCUMENT TYPE HINT: ${params.documentTypeHint}
ILLEGIBLE OR MISSING NOTES: ${params.illegibleNotes.length > 0 ? params.illegibleNotes.join('; ') : 'None'}

DETERMINISTIC RULE-ENGINE EVALUATED ROWS (JSON):
${JSON.stringify(compactRows, null, 2)}

ORIGINAL EXTRACTED DOCUMENT TEXT:
${params.rawText.slice(0, 12000)}

INSTRUCTIONS:
- Produce one entry in "finding_explanations" for each row in DETERMINISTIC RULE-ENGINE EVALUATED ROWS using the exact matching "id".
- Never downgrade "preliminary_tier". If "preliminary_tier" is "POTENTIALLY_URGENT", "suggested_tier" MUST be "POTENTIALLY_URGENT".
- If medications/prescriptions are mentioned in the document, list them in "medications" with their exact dosage/frequency from the document, a plain educational purpose, and a non-directive safety_note reminding the patient not to change their regimen without talking to their prescriber.
- Provide a concise "terminology" glossary explaining complex medical terms appearing in the document.
- Provide 4 to 6 specific, practical "doctor_questions" tailored to this exact report so the patient feels prepared at their next appointment.${repairSection}`;
}

export async function interpretWithSafetyValidation(params: {
  evaluatedRows: RuleEvaluatedRow[];
  rawText: string;
  rawUrgentReasons: string[];
  illegibleNotes: string[];
  extractionMethod: ExtractionMethod;
  extractionConfidence: ConfidenceLevel;
  documentTypeHint: DocumentType;
}): Promise<AnalysisResponse> {
  const ai = getGeminiClient();

  const callModel = async (repairViolations?: string[]): Promise<unknown> => {
    const prompt = buildPromptPayload({
      evaluatedRows: params.evaluatedRows,
      rawText: params.rawText,
      illegibleNotes: params.illegibleNotes,
      documentTypeHint: params.documentTypeHint,
      repairViolations,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: INTERPRETATION_RESPONSE_SCHEMA,
      },
    });

    const jsonStr = (response.text ?? '{}').trim();
    return JSON.parse(jsonStr);
  };

  // Attempt 1
  let firstJson: unknown;
  try {
    firstJson = await callModel();
  } catch (err) {
    // Propagate API/key/network errors cleanly so UI informs the user rather than masking
    throw err;
  }

  const firstValidation = validateLlmOutput({
    rawJson: firstJson,
    evaluatedRows: params.evaluatedRows,
    rawText: params.rawText,
  });

  if (firstValidation.valid && firstValidation.parsed) {
    return mergeValidatedResult({
      llm: firstValidation.parsed,
      evaluatedRows: params.evaluatedRows,
      rawUrgentReasons: params.rawUrgentReasons,
      illegibleNotes: params.illegibleNotes,
      extractionMethod: params.extractionMethod,
      extractionConfidence: params.extractionConfidence,
      retryUsed: false,
      validationNotes: ['Passed schema, hallucination traceability, banned-phrase, and tier-lock checks.'],
    });
  }

  // Attempt 2 (Automatic repair retry)
  let secondJson: unknown;
  try {
    secondJson = await callModel(firstValidation.violations);
  } catch {
    return buildSafeFallbackResult({
      evaluatedRows: params.evaluatedRows,
      rawUrgentReasons: params.rawUrgentReasons,
      illegibleNotes: params.illegibleNotes,
      extractionMethod: params.extractionMethod,
      extractionConfidence: params.extractionConfidence,
      documentTypeHint: params.documentTypeHint,
      retryUsed: true,
      validationNotes: [
        ...firstValidation.violations,
        'Repair retry failed; reverted to deterministic rule-engine output.',
      ],
    });
  }

  const secondValidation = validateLlmOutput({
    rawJson: secondJson,
    evaluatedRows: params.evaluatedRows,
    rawText: params.rawText,
  });

  if (secondValidation.valid && secondValidation.parsed) {
    return mergeValidatedResult({
      llm: secondValidation.parsed,
      evaluatedRows: params.evaluatedRows,
      rawUrgentReasons: params.rawUrgentReasons,
      illegibleNotes: params.illegibleNotes,
      extractionMethod: params.extractionMethod,
      extractionConfidence: params.extractionConfidence,
      retryUsed: true,
      validationNotes: [
        'Initial draft flagged by safety validator; automatically repaired and verified on retry.',
      ],
    });
  }

  // Deterministic Rule-Engine-Only Fallback
  return buildSafeFallbackResult({
    evaluatedRows: params.evaluatedRows,
    rawUrgentReasons: params.rawUrgentReasons,
    illegibleNotes: params.illegibleNotes,
    extractionMethod: params.extractionMethod,
    extractionConfidence: params.extractionConfidence,
    documentTypeHint: params.documentTypeHint,
    retryUsed: true,
    validationNotes: [
      ...secondValidation.violations,
      'Reverted to deterministic rule-engine-only safe output after repair retry.',
    ],
  });
}
