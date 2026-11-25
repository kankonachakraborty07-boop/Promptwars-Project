import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { TriageTier } from '../shared/clinicalTypes';

interface TriageBadgeProps {
  tier: TriageTier;
  size?: 'sm' | 'md';
}

export function TriageBadge({ tier, size = 'sm' }: TriageBadgeProps) {
  const padding = size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (tier === 'POTENTIALLY_URGENT') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 font-semibold text-rose-800 whitespace-nowrap shrink-0 ${padding}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-700 shrink-0" aria-hidden="true" />
        <span>Potentially Urgent</span>
      </span>
    );
  }

  if (tier === 'ABNORMAL') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 font-semibold text-amber-900 whitespace-nowrap shrink-0 ${padding}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
        <span>Abnormal</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 whitespace-nowrap shrink-0 ${padding}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
      <span>Normal</span>
    </span>
  );
}
