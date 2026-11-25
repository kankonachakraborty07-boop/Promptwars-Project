import { BookOpen, Pill, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MedicationItem, TerminologyEntry } from '../shared/clinicalTypes';

interface MedicationsAndGlossaryProps {
  medications: MedicationItem[];
  terminology: TerminologyEntry[];
}

export function MedicationsAndGlossary({
  medications,
  terminology,
}: MedicationsAndGlossaryProps) {
  const [termQuery, setTermQuery] = useState('');

  const filteredTerms = useMemo(() => {
    const q = termQuery.trim().toLowerCase();
    if (!q) return terminology;
    return terminology.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.plain_explanation.toLowerCase().includes(q) ||
        t.context_in_report.toLowerCase().includes(q)
    );
  }, [terminology, termQuery]);

  return (
    <section id="terminology" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Medications / Prescriptions Panel */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2.5">
          <Pill className="w-4 h-4 text-sky-800 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Medications Mentioned in Document
            </h2>
            <p className="text-xs text-slate-500">
              Educational overview only · Never change doses without your prescriber
            </p>
          </div>
        </div>

        {medications.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            No medications or prescription lines were detected in this document.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {medications.map((med, idx) => (
              <div key={idx} className="p-5 space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{med.name}</h3>
                  <span className="text-xs font-mono text-slate-600 tabular-nums">
                    {[med.dosage_in_doc, med.frequency_in_doc].filter(Boolean).join(' · ') ||
                      'Dosage not specified'}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{med.plain_purpose}</p>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  {med.safety_note}
                </p>
                <p className="text-[11px] font-mono text-slate-500 break-words">
                  Source: &ldquo;{med.source_text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical Terminology Glossary */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-sky-800 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Medical Terminology Glossary
              </h2>
              <p className="text-xs text-slate-500">
                Plain-language definitions tied to terms in your report
              </p>
            </div>
          </div>

          {terminology.length > 0 && (
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={termQuery}
                onChange={(e) => setTermQuery(e.target.value)}
                placeholder="Search terms..."
                aria-label="Search medical terminology"
                className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
              />
            </div>
          )}
        </div>

        {filteredTerms.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            {terminology.length === 0
              ? 'No specialized medical terms were flagged for glossary expansion.'
              : 'No terminology entries match your search.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTerms.map((entry, idx) => (
              <div key={idx} className="p-5 space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{entry.term}</h3>
                  <span className="text-xs text-slate-500">{entry.context_in_report}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {entry.plain_explanation}
                </p>
                <p className="text-[11px] font-mono text-slate-500 break-words">
                  Source: &ldquo;{entry.source_text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
