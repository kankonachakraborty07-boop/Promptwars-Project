import { PhoneCall, ShieldAlert } from 'lucide-react';
import { UrgentEscalation } from '../shared/clinicalTypes';

interface EmergencyEscalationPanelProps {
  escalation: UrgentEscalation;
}

export function EmergencyEscalationPanel({ escalation }: EmergencyEscalationPanelProps) {
  if (!escalation.triggered) return null;

  return (
    <section
      aria-label="Emergency Escalation Panel"
      className="rounded-xl border-2 border-rose-600 bg-rose-50/70 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-rose-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-700 shrink-0">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-800 tracking-wide">
              NCPL Meditech Emergency Escalation Alert · Potentially Urgent
            </p>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              {escalation.headline}
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Potentially urgent means a value or flag crossed a critical-review threshold and
              should be reviewed promptly by a clinician. It is not a diagnosis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-rose-700 text-white rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0">
          <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Contact Doctor Same Day / 911 if Symptomatic</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Triggering Findings */}
        <div className="bg-white border border-rose-200 rounded-lg p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-rose-900">
            What triggered this alert
          </h3>
          <ul className="space-y-2 text-xs text-slate-800 leading-relaxed">
            {escalation.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-rose-700 font-semibold shrink-0">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Same-Day Actions */}
        <div className="bg-white border border-rose-200 rounded-lg p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-900">
            Recommended next steps
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
            {escalation.immediate_actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-slate-600 font-semibold shrink-0">
                  {idx + 1}.
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Emergency Red-Flag Symptoms */}
        <div className="bg-white border border-rose-200 rounded-lg p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-rose-900">
            Seek emergency care (call 911 / local EMS) immediately if you experience:
          </h3>
          <ul className="space-y-2 text-xs text-slate-800 leading-relaxed">
            {escalation.emergency_symptoms.map((sym, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-rose-700 font-semibold shrink-0">!</span>
                <span>{sym}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
