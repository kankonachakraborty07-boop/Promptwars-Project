import { AlertCircle } from 'lucide-react';
import { AnalysisResponse, TRIAGE_DEFINITIONS } from '../shared/clinicalTypes';
import { TriageBadge } from './TriageBadge';

interface TriageSummaryStripProps {
  analysis: AnalysisResponse;
}

const DOC_TYPE_LABELS: Record<AnalysisResponse['document_type'], string> = {
  lab_report: 'Laboratory Report',
  prescription: 'Prescription',
  clinical_note: 'Clinical Note',
  mixed: 'Combined Labs & Prescription',
  unknown: 'Clinical Document',
};

const METHOD_LABELS: Record<AnalysisResponse['pipeline_audit']['extraction_method'], string> = {
  pdf_text: 'PDF Text Extraction',
  multimodal_vision: 'Vision Scan Transcription',
  raw_text: 'Structured Text Parsing',
};

export function TriageSummaryStrip({ analysis }: TriageSummaryStripProps) {
  const urgentCount = analysis.findings.filter(
    (f) => f.final_tier === 'POTENTIALLY_URGENT'
  ).length;
  const abnormalCount = analysis.findings.filter((f) => f.final_tier === 'ABNORMAL').length;
  const normalCount = analysis.findings.filter((f) => f.final_tier === 'NORMAL').length;

  return (
    <section className="space-y-6">
      {/* 4-Column Clinical KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Overall Triage</p>
          <div className="pt-0.5">
            <TriageBadge tier={analysis.overall_triage} size="md" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {TRIAGE_DEFINITIONS[analysis.overall_triage].description}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Evaluated Findings</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {analysis.findings.length}
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
            <span className="text-rose-700 font-semibold">{urgentCount} Urgent</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-semibold">{abnormalCount} Abnormal</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold">{normalCount} Normal</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Document &amp; Confidence</p>
          <p className="text-lg font-semibold text-slate-900 capitalize">
            {analysis.confidence} Confidence
          </p>
          <p className="text-xs text-slate-600">
            {DOC_TYPE_LABELS[analysis.document_type]} ·{' '}
            {METHOD_LABELS[analysis.pipeline_audit.extraction_method]}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Safety Verification</p>
          <p className="text-lg font-semibold text-slate-900">
            {analysis.pipeline_audit.fallback_mode
              ? 'Rule-Engine Safe Mode'
              : 'Validated Output'}
          </p>
          <p className="text-xs text-slate-600">
            {analysis.pipeline_audit.retry_used
              ? 'Auto-repaired and re-checked against safety rules'
              : 'Passed schema, traceability & phrase checks'}
          </p>
        </div>
      </div>

      {/* Plain-Language Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Plain-Language Report Summary
          </h2>
          <span className="text-xs text-slate-500">
            {analysis.confidence_note}
          </span>
        </div>
        <p className="text-base text-slate-700 leading-relaxed max-w-4xl">
          {analysis.plain_summary}
        </p>

        {analysis.unparsed_or_illegible_notes.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>Ambiguous or illegible document sections noted (not guessed)</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-900">
              {analysis.unparsed_or_illegible_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
