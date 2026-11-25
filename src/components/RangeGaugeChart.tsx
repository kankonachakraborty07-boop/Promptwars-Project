import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FindingResult, TriageTier } from '../shared/clinicalTypes';

interface BiomarkerRangeTrackProps {
  finding: FindingResult;
}

export function BiomarkerRangeTrack({ finding }: BiomarkerRangeTrackProps) {
  const val = finding.numeric_value;
  const low = finding.effective_range.low;
  const high = finding.effective_range.high;

  if (val === null || (low === null && high === null)) {
    return (
      <div className="text-xs text-slate-500 font-mono">
        Visual range gauge unavailable (non-numeric value or reference range not provided)
      </div>
    );
  }

  const effectiveLow = low ?? 0;
  const effectiveHigh = high ?? Math.max(effectiveLow * 2, val * 1.3, 10);
  const span = Math.max(effectiveHigh - effectiveLow, 0.01);

  const domainMin = Math.min(effectiveLow - span * 0.6, val - span * 0.15);
  const domainMax = Math.max(effectiveHigh + span * 0.6, val + span * 0.15);
  const totalDomain = Math.max(domainMax - domainMin, 0.01);

  const toPct = (n: number) =>
    Math.min(98, Math.max(2, ((n - domainMin) / totalDomain) * 100));

  const normalLeftPct = low !== null ? toPct(effectiveLow) : 0;
  const normalRightPct = high !== null ? toPct(effectiveHigh) : 100;
  const normalWidthPct = Math.max(4, normalRightPct - normalLeftPct);
  const markerPct = toPct(val);

  const markerColor =
    finding.final_tier === 'POTENTIALLY_URGENT'
      ? 'bg-rose-600 ring-rose-200'
      : finding.final_tier === 'ABNORMAL'
        ? 'bg-amber-600 ring-amber-200'
        : 'bg-emerald-600 ring-emerald-200';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
        <span>{low !== null ? `Low: ${low}` : 'No lower bound'}</span>
        <span>
          Measured: <strong className="text-slate-900">{val}</strong> {finding.unit}
        </span>
        <span>{high !== null ? `High: ${high}` : 'No upper bound'}</span>
      </div>
      <div
        className="relative h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden"
        aria-label={`Range gauge for ${finding.test_name}: value ${val} against range ${finding.effective_range.text}`}
      >
        {/* Normal Reference Band */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-100 border-x border-emerald-300"
          style={{
            left: `${normalLeftPct}%`,
            width: `${normalWidthPct}%`,
          }}
        />
        {/* Patient Measured Marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-4 ${markerColor}`}
          style={{ left: `${markerPct}%` }}
        />
      </div>
    </div>
  );
}

interface SeverityOverviewChartProps {
  findings: FindingResult[];
}

const TIER_COLORS: Record<TriageTier, string> = {
  NORMAL: '#16A34A',
  ABNORMAL: '#D97706',
  POTENTIALLY_URGENT: '#DC2626',
};

export function SeverityOverviewChart({ findings }: SeverityOverviewChartProps) {
  const numericFindings = findings.filter((f) => f.numeric_value !== null);
  if (numericFindings.length === 0) return null;

  const data = numericFindings.map((f) => ({
    name: f.test_name.length > 18 ? `${f.test_name.slice(0, 16)}…` : f.test_name,
    fullName: f.test_name,
    // Show a small 0.08 baseline for 0.00 so normal bars remain visible on the chart
    chartRatio: f.severity_ratio === 0 ? 0.06 : f.severity_ratio,
    rawRatio: f.severity_ratio,
    valueDisplay: `${f.value}${f.unit ? ` ${f.unit}` : ''}`,
    rangeText: f.effective_range.text,
    tier: f.final_tier,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Reference Range Deviation Overview
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Severity ratio measures how far a value sits outside its reference band (0.00 =
            within normal range)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>Green: Normal</span>
          <span>Amber: Abnormal</span>
          <span>Crimson: Potentially Urgent</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#475569' }}
              interval={0}
              angle={data.length > 6 ? -18 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 50 : 30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#475569' }}
              label={{
                value: 'Severity Ratio',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#64748B' },
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm text-xs space-y-1">
                    <p className="font-semibold text-slate-900">{d.fullName}</p>
                    <p className="font-mono tabular-nums text-slate-700">
                      Measured: {d.valueDisplay}
                    </p>
                    <p className="text-slate-500">Range: {d.rangeText}</p>
                    <p className="font-mono tabular-nums text-slate-800">
                      Severity Ratio: {d.rawRatio.toFixed(2)} ({d.tier.replace('_', ' ')})
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={2.0} stroke="#DC2626" strokeDasharray="4 4" />
            <Bar dataKey="chartRatio" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={TIER_COLORS[entry.tier]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
