export type TriageTier = 'NORMAL' | 'ABNORMAL' | 'POTENTIALLY_URGENT';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type RangeSource = 'document' | 'typical_adult_guide' | 'not_provided';

export type ExtractionMethod = 'pdf_text' | 'multimodal_vision' | 'raw_text';

export type DocumentType = 'lab_report' | 'prescription' | 'clinical_note' | 'mixed' | 'unknown';

export interface ExtractedRow {
  id: string;
  test_name: string;
  value: string;
  numeric_value: number | null;
  unit: string;
  reference_range: string;
  flag_in_doc: string | null;
  page: number;
  source_text: string;
}

export interface EffectiveRange {
  low: number | null;
  high: number | null;
  text: string;
  unit: string;
}

export interface RuleEvaluatedRow extends ExtractedRow {
  canonical_name: string | null;
  preliminary_tier: TriageTier;
  severity_ratio: number;
  range_source: RangeSource;
  effective_range: EffectiveRange;
  critical_low: number | null;
  critical_high: number | null;
  critical_reason: string | null;
  direction: 'within' | 'high' | 'low' | 'unknown';
  confidence: ConfidenceLevel;
  default_what_it_measures: string;
}

export interface FindingResult extends RuleEvaluatedRow {
  final_tier: TriageTier;
  tier_escalated_by_ai: boolean;
  plain_explanation: string;
  what_it_measures: string;
  source_quote: string;
}

export interface MedicationItem {
  name: string;
  dosage_in_doc: string;
  frequency_in_doc: string;
  plain_purpose: string;
  safety_note: string;
  source_text: string;
}

export interface TerminologyEntry {
  term: string;
  plain_explanation: string;
  context_in_report: string;
  source_text: string;
}

export interface UrgentEscalation {
  triggered: boolean;
  headline: string;
  reasons: string[];
  immediate_actions: string[];
  emergency_symptoms: string[];
}

export interface PipelineAudit {
  extraction_method: ExtractionMethod;
  extracted_rows_count: number;
  validator_passed: boolean;
  retry_used: boolean;
  fallback_mode: boolean;
  validation_notes: string[];
}

export interface AnalysisResponse {
  document_type: DocumentType;
  overall_triage: TriageTier;
  confidence: ConfidenceLevel;
  confidence_note: string;
  plain_summary: string;
  urgent_escalation: UrgentEscalation;
  findings: FindingResult[];
  medications: MedicationItem[];
  terminology: TerminologyEntry[];
  doctor_questions: string[];
  unparsed_or_illegible_notes: string[];
  pipeline_audit: PipelineAudit;
  disclaimer: 'Educational information only. Not a diagnosis. Talk to your doctor.';
}

export const PERSISTENT_DISCLAIMER =
  'Educational information only. Not a diagnosis. Talk to your doctor.' as const;

export const TRIAGE_DEFINITIONS: Record<TriageTier, { label: string; description: string }> = {
  NORMAL: {
    label: 'Normal',
    description: 'Within the reference range.',
  },
  ABNORMAL: {
    label: 'Abnormal',
    description:
      'Outside range but not in the critical band; worth discussing at the next routine appointment.',
  },
  POTENTIALLY_URGENT: {
    label: 'Potentially Urgent',
    description:
      'Critical-band value or urgent document flag that suggests contacting a doctor or clinic the same day, or emergency services if symptoms are present. Urgent never means a diagnosis; it means get this reviewed promptly.',
  },
};
