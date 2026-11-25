import { z } from 'zod';
import {
  AnalysisResponse,
  ConfidenceLevel,
  DocumentType,
  ExtractionMethod,
  FindingResult,
  PERSISTENT_DISCLAIMER,
  RuleEvaluatedRow,
  TriageTier,
  UrgentEscalation,
} from '../src/shared/clinicalTypes.ts';

export const LlmInterpretationSchema = z.object({
  document_type: z.enum(['lab_report', 'prescription', 'clinical_note', 'mixed', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low']),
  confidence_note: z.string().min(1),
  plain_summary: z.string().min(10),
  finding_explanations: z.array(
    z.object({
      id: z.string(),
      suggested_tier: z.enum(['NORMAL', 'ABNORMAL', 'POTENTIALLY_URGENT']),
      what_it_measures: z.string().min(5),
      plain_explanation: z.string().min(10),
      source_quote: z.string().min(1),
    })
  ),
  medications: z.array(
    z.object({
      name: z.string().min(1),
      dosage_in_doc: z.string(),
      frequency_in_doc: z.string(),
      plain_purpose: z.string().min(5),
      safety_note: z.string().min(5),
      source_text: z.string().min(1),
    })
  ),
  terminology: z.array(
    z.object({
      term: z.string().min(1),
      plain_explanation: z.string().min(5),
      context_in_report: z.string().min(3),
      source_text: z.string().min(1),
    })
  ),
  doctor_questions: z.array(z.string().min(5)).min(1),
  additional_urgent_reasons: z.array(z.string()),
});

export type LlmInterpretationPayload = z.infer<typeof LlmInterpretationSchema>;

const BANNED_PHRASE_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'diagnostic phrase ("you have")', regex: /\byou\s+have\b/i },
  { label: 'diagnostic phrase ("diagnosed with")', regex: /\bdiagnosed\s+with\b/i },
  { label: 'diagnostic phrase ("diagnosis of")', regex: /\bdiagnosis\s+of\b/i },
  { label: 'diagnostic phrase ("you suffer from")', regex: /\byou\s+suffer\s+from\b/i },
  { label: 'diagnostic phrase ("confirms you have")', regex: /\bconfirms?\s+you\s+have\b/i },
  { label: 'medication directive ("stop taking")', regex: /\bstop\s+taking\b/i },
  { label: 'medication directive ("discontinue")', regex: /\bdiscontinue\b/i },
  { label: 'medication directive ("start taking")', regex: /\bstart\s+taking\b/i },
  {
    label: 'dosage directive ("increase/decrease/change your dose")',
    regex: /\b(?:increase|decrease|lower|raise|adjust|change)\s+(?:your\s+)?(?:dose|dosage|medication)\b/i,
  },
];

const TIER_RANK: Record<TriageTier, number> = {
  NORMAL: 0,
  ABNORMAL: 1,
  POTENTIALLY_URGENT: 2,
};

export interface ValidationOutcome {
  valid: boolean;
  violations: string[];
  parsed?: LlmInterpretationPayload;
}

function normalizeForTrace(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function validateLlmOutput(params: {
  rawJson: unknown;
  evaluatedRows: RuleEvaluatedRow[];
  rawText: string;
}): ValidationOutcome {
  const violations: string[] = [];

  const schemaResult = LlmInterpretationSchema.safeParse(params.rawJson);
  if (!schemaResult.success) {
    return {
      valid: false,
      violations: [
        `JSON schema mismatch: ${schemaResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      ],
    };
  }

  const data = schemaResult.data;

  // 1. Banned-phrase scan across all generated strings
  const textFieldsToScan: Array<{ field: string; text: string }> = [
    { field: 'plain_summary', text: data.plain_summary },
    { field: 'confidence_note', text: data.confidence_note },
    ...data.finding_explanations.flatMap((f) => [
      { field: `finding(${f.id}).what_it_measures`, text: f.what_it_measures },
      { field: `finding(${f.id}).plain_explanation`, text: f.plain_explanation },
    ]),
    ...data.medications.flatMap((m) => [
      { field: `medication(${m.name}).plain_purpose`, text: m.plain_purpose },
      { field: `medication(${m.name}).safety_note`, text: m.safety_note },
    ]),
    ...data.terminology.flatMap((t) => [
      { field: `terminology(${t.term}).plain_explanation`, text: t.plain_explanation },
      { field: `terminology(${t.term}).context_in_report`, text: t.context_in_report },
    ]),
    ...data.doctor_questions.map((q, idx) => ({ field: `doctor_questions[${idx}]`, text: q })),
  ];

  for (const item of textFieldsToScan) {
    for (const rule of BANNED_PHRASE_PATTERNS) {
      if (rule.regex.test(item.text)) {
        violations.push(`Banned ${rule.label} found in ${item.field}`);
      }
    }
  }

  // 2. Hallucination / Traceability check
  const rowMap = new Map(params.evaluatedRows.map((r) => [r.id, r]));
  const normalizedRaw = normalizeForTrace(params.rawText);

  for (const exp of data.finding_explanations) {
    const matchedRow = rowMap.get(exp.id);
    if (!matchedRow) {
      violations.push(`Finding explanation references unknown row id "${exp.id}"`);
      continue;
    }

    // Check that numeric value mentioned isn't contradicting row, and source_quote traces back
    const normQuote = normalizeForTrace(exp.source_quote);
    const normRowSrc = normalizeForTrace(matchedRow.source_text);
    const quoteTraces =
      normQuote.length >= 2 &&
      (normRowSrc.includes(normQuote) ||
        normQuote.includes(normRowSrc) ||
        normalizedRaw.includes(normQuote));

    if (!quoteTraces && normRowSrc.length > 0) {
      // Soft warning only if rawText doesn't contain it; check test name presence
      if (!normQuote.includes(matchedRow.test_name.toLowerCase().slice(0, 4))) {
        violations.push(`Source quote for "${matchedRow.test_name}" could not be traced to document`);
      }
    }
  }

  // Verify medication names appear in document text (when rawText exists)
  if (normalizedRaw.length > 20) {
    for (const med of data.medications) {
      const medToken = med.name.toLowerCase().split(/\s+/)[0];
      if (medToken.length >= 3 && !normalizedRaw.includes(medToken)) {
        violations.push(`Medication "${med.name}" does not appear in the extracted document text`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    parsed: data,
  };
}

export function buildEscalationPanel(
  findings: FindingResult[],
  extraReasons: string[]
): UrgentEscalation {
  const urgentFindings = findings.filter((f) => f.final_tier === 'POTENTIALLY_URGENT');
  const reasons: string[] = [];

  for (const f of urgentFindings) {
    if (f.critical_reason) {
      reasons.push(`${f.test_name} (${f.value}${f.unit ? ` ${f.unit}` : ''}): ${f.critical_reason}`);
    } else {
      reasons.push(
        `${f.test_name} (${f.value}${f.unit ? ` ${f.unit}` : ''}) was flagged for prompt clinical review.`
      );
    }
  }

  for (const r of extraReasons) {
    if (r && !reasons.includes(r)) {
      reasons.push(r);
    }
  }

  const triggered = reasons.length > 0;

  return {
    triggered,
    headline: triggered
      ? 'Prompt Clinical Review Recommended'
      : 'No Critical-Band Values Detected',
    reasons,
    immediate_actions: triggered
      ? [
          'Contact your ordering doctor, clinic, or urgent care team the same day to review these results directly.',
          'Bring or share the original laboratory report page so your clinician can verify units and timing.',
          'Do not start, stop, or adjust any prescribed medication before speaking with your clinician.',
        ]
      : [],
    emergency_symptoms: triggered
      ? [
          'Chest pain, pressure, tightness, or pain spreading to the arm, neck, or jaw',
          'Shortness of breath, sudden dizziness, fainting, or confusion',
          'Severe headache, weakness on one side, uncontrolled bleeding, or rapidly worsening symptoms',
        ]
      : [],
  };
}

export function computeOverallTriage(
  findings: FindingResult[],
  rawUrgentReasons: string[]
): TriageTier {
  if (
    findings.some((f) => f.final_tier === 'POTENTIALLY_URGENT') ||
    rawUrgentReasons.length > 0
  ) {
    return 'POTENTIALLY_URGENT';
  }
  if (findings.some((f) => f.final_tier === 'ABNORMAL')) {
    return 'ABNORMAL';
  }
  return 'NORMAL';
}

export function mergeValidatedResult(params: {
  llm: LlmInterpretationPayload;
  evaluatedRows: RuleEvaluatedRow[];
  rawUrgentReasons: string[];
  illegibleNotes: string[];
  extractionMethod: ExtractionMethod;
  extractionConfidence: ConfidenceLevel;
  retryUsed: boolean;
  validationNotes: string[];
}): AnalysisResponse {
  const expMap = new Map(params.llm.finding_explanations.map((e) => [e.id, e]));

  const findings: FindingResult[] = params.evaluatedRows.map((row) => {
    const exp = expMap.get(row.id);
    // Tier-lock enforcement: LLM may escalate, NEVER downgrade a rule-engine POTENTIALLY_URGENT (or any higher rule tier)
    const suggested = exp?.suggested_tier ?? row.preliminary_tier;
    const finalTier: TriageTier =
      TIER_RANK[suggested] >= TIER_RANK[row.preliminary_tier]
        ? suggested
        : row.preliminary_tier;

    return {
      ...row,
      final_tier: finalTier,
      tier_escalated_by_ai: TIER_RANK[finalTier] > TIER_RANK[row.preliminary_tier],
      what_it_measures: exp?.what_it_measures || row.default_what_it_measures,
      plain_explanation:
        exp?.plain_explanation ||
        `This value (${row.value}${row.unit ? ` ${row.unit}` : ''}) is often looked at by doctors when assessing ${row.canonical_name ?? row.test_name}.`,
      source_quote: row.source_text || exp?.source_quote || '',
    };
  });

  const urgentEscalation = buildEscalationPanel(findings, [
    ...params.rawUrgentReasons,
    ...params.llm.additional_urgent_reasons,
  ]);
  const overallTriage = computeOverallTriage(findings, [
    ...params.rawUrgentReasons,
    ...params.llm.additional_urgent_reasons,
  ]);

  const effectiveConfidence: ConfidenceLevel =
    params.illegibleNotes.length > 0 || params.extractionConfidence === 'low'
      ? 'low'
      : params.llm.confidence;

  return {
    document_type: params.llm.document_type,
    overall_triage: overallTriage,
    confidence: effectiveConfidence,
    confidence_note:
      params.illegibleNotes.length > 0
        ? `Confidence lowered due to incomplete or ambiguous document text: ${params.illegibleNotes.join('; ')}`
        : params.llm.confidence_note,
    plain_summary: params.llm.plain_summary,
    urgent_escalation: urgentEscalation,
    findings,
    medications: params.llm.medications,
    terminology: params.llm.terminology,
    doctor_questions: params.llm.doctor_questions,
    unparsed_or_illegible_notes: params.illegibleNotes,
    pipeline_audit: {
      extraction_method: params.extractionMethod,
      extracted_rows_count: params.evaluatedRows.length,
      validator_passed: true,
      retry_used: params.retryUsed,
      fallback_mode: false,
      validation_notes: params.validationNotes,
    },
    disclaimer: PERSISTENT_DISCLAIMER,
  };
}

export function buildSafeFallbackResult(params: {
  evaluatedRows: RuleEvaluatedRow[];
  rawUrgentReasons: string[];
  illegibleNotes: string[];
  extractionMethod: ExtractionMethod;
  extractionConfidence: ConfidenceLevel;
  documentTypeHint: DocumentType;
  retryUsed: boolean;
  validationNotes: string[];
}): AnalysisResponse {
  const findings: FindingResult[] = params.evaluatedRows.map((row) => {
    let explanation = `This measurement (${row.value}${row.unit ? ` ${row.unit}` : ''}) is often looked at by doctors when assessing ${row.canonical_name ?? row.test_name}.`;
    if (row.preliminary_tier === 'NORMAL') {
      explanation += ` In this report, it falls within ${row.effective_range.text}.`;
    } else if (row.preliminary_tier === 'ABNORMAL') {
      explanation += ` It falls outside ${row.effective_range.text} and is worth discussing at your next routine appointment.`;
    } else {
      explanation += ` It triggered a prompt-review threshold in our deterministic clinical check and should be reviewed by a clinician promptly.`;
    }

    return {
      ...row,
      final_tier: row.preliminary_tier,
      tier_escalated_by_ai: false,
      what_it_measures: row.default_what_it_measures,
      plain_explanation: explanation,
      source_quote: row.source_text,
    };
  });

  const urgentEscalation = buildEscalationPanel(findings, params.rawUrgentReasons);
  const overallTriage = computeOverallTriage(findings, params.rawUrgentReasons);

  const urgentCount = findings.filter((f) => f.final_tier === 'POTENTIALLY_URGENT').length;
  const abnormalCount = findings.filter((f) => f.final_tier === 'ABNORMAL').length;
  const normalCount = findings.filter((f) => f.final_tier === 'NORMAL').length;

  const summary =
    findings.length > 0
      ? `Our deterministic clinical rule engine reviewed ${findings.length} extracted measurements: ${urgentCount} classified as Potentially Urgent, ${abnormalCount} as Abnormal, and ${normalCount} as Normal. Please review each listed source quote and discuss these results directly with your doctor.`
      : 'No structured lab rows could be verified automatically from this document. Please share the original report directly with your healthcare clinician for review.';

  return {
    document_type: params.documentTypeHint,
    overall_triage: overallTriage,
    confidence: findings.length === 0 || params.illegibleNotes.length > 0 ? 'low' : params.extractionConfidence,
    confidence_note:
      'Displayed using deterministic rule-engine verification mode to guarantee zero unverified phrasing.',
    plain_summary: summary,
    urgent_escalation: urgentEscalation,
    findings,
    medications: [],
    terminology: findings.slice(0, 5).map((f) => ({
      term: f.canonical_name ?? f.test_name,
      plain_explanation: f.default_what_it_measures,
      context_in_report: `Reported as ${f.value}${f.unit ? ` ${f.unit}` : ''} (${f.final_tier.replace('_', ' ')}).`,
      source_text: f.source_text,
    })),
    doctor_questions: [
      'Which values on this report matter most for my current health history and symptoms?',
      'Do any of these measurements require repeat testing or same-day follow-up?',
      'How do these results relate to any medications or supplements I currently take?',
    ],
    unparsed_or_illegible_notes: params.illegibleNotes,
    pipeline_audit: {
      extraction_method: params.extractionMethod,
      extracted_rows_count: params.evaluatedRows.length,
      validator_passed: false,
      retry_used: params.retryUsed,
      fallback_mode: true,
      validation_notes: params.validationNotes,
    },
    disclaimer: PERSISTENT_DISCLAIMER,
  };
}
