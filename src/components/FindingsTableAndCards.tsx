import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FindingResult, RangeSource, TriageTier } from '../shared/clinicalTypes';
import { BiomarkerRangeTrack, SeverityOverviewChart } from './RangeGaugeChart';
import { TriageBadge } from './TriageBadge';

interface FindingsTableAndCardsProps {
  findings: FindingResult[];
}

const TIER_SORT_ORDER: Record<TriageTier, number> = {
  POTENTIALLY_URGENT: 0,
  ABNORMAL: 1,
  NORMAL: 2,
};

const RANGE_SOURCE_LABEL: Record<RangeSource, string> = {
  document: 'Document reference range',
  typical_adult_guide: 'Typical adult range (general guide)',
  not_provided: 'Range not provided in document',
};

export function FindingsTableAndCards({ findings }: FindingsTableAndCardsProps) {
  const [tierFilter, setTierFilter] = useState<'ALL' | TriageTier>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    return {
      ALL: findings.length,
      POTENTIALLY_URGENT: findings.filter((f) => f.final_tier === 'POTENTIALLY_URGENT').length,
      ABNORMAL: findings.filter((f) => f.final_tier === 'ABNORMAL').length,
      NORMAL: findings.filter((f) => f.final_tier === 'NORMAL').length,
    };
  }, [findings]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...findings]
      .sort((a, b) => {
        const tierDiff = TIER_SORT_ORDER[a.final_tier] - TIER_SORT_ORDER[b.final_tier];
        if (tierDiff !== 0) return tierDiff;
        return b.severity_ratio - a.severity_ratio;
      })
      .filter((f) => {
        if (tierFilter !== 'ALL' && f.final_tier !== tierFilter) return false;
        if (!q) return true;
        return (
          f.test_name.toLowerCase().includes(q) ||
          f.plain_explanation.toLowerCase().includes(q) ||
          f.source_quote.toLowerCase().includes(q)
        );
      });
  }, [findings, tierFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  };

  if (findings.length === 0) {
    return (
      <section id="triage-findings" className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Triage Findings</h2>
        <p className="text-sm text-slate-600 mt-2">
          No structured quantitative lab measurements were detected in this document. Review the
          Medication, Terminology, and Doctor Questions sections below for guidance from the text.
        </p>
      </section>
    );
  }

  return (
    <section id="triage-findings" className="space-y-6">
      <SeverityOverviewChart findings={findings} />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Detailed Triage Findings &amp; Traceability
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sorted by clinical urgency · Every finding links directly to its verbatim quote in
              your document
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Segmented Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(
                [
                  { key: 'ALL', label: `All (${counts.ALL})` },
                  { key: 'POTENTIALLY_URGENT', label: `Urgent (${counts.POTENTIALLY_URGENT})` },
                  { key: 'ABNORMAL', label: `Abnormal (${counts.ABNORMAL})` },
                  { key: 'NORMAL', label: `Normal (${counts.NORMAL})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTierFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tierFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tests..."
                aria-label="Filter test findings"
                className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
              />
            </div>
          </div>
        </div>

        {/* Findings List */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No findings match your current filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((finding) => {
              const isExpanded =
                expandedIds[finding.id] ?? finding.final_tier !== 'NORMAL';

              return (
                <div key={finding.id} className="p-5 sm:px-6 transition-colors hover:bg-slate-50/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900">
                          {finding.test_name}
                        </h3>
                        <TriageBadge tier={finding.final_tier} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                        <span>Page {finding.page}</span>
                        <span aria-hidden="true">·</span>
                        <span>{RANGE_SOURCE_LABEL[finding.range_source]}</span>
                        {finding.flag_in_doc && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700">
                              Document flag: {finding.flag_in_doc}
                            </span>
                          </>
                        )}
                        {finding.tier_escalated_by_ai && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-800 font-medium">
                              Escalated for clinical context
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                          {finding.value}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            {finding.unit}
                          </span>
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          Ref: {finding.effective_range.text}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(finding.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md bg-white cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                      <BiomarkerRangeTrack finding={finding} />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-700">
                            What this test measures
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            {finding.what_it_measures}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-700">
                            Plain-language explanation
                          </p>
                          <p className="text-slate-700 leading-relaxed">
                            {finding.plain_explanation}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-600 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono break-all">
                          Source quote (Page {finding.page}): &ldquo;{finding.source_quote}&rdquo;
                        </span>
                        <span className="font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                          Severity ratio: {finding.severity_ratio.toFixed(2)} · Confidence:{' '}
                          {finding.confidence}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
