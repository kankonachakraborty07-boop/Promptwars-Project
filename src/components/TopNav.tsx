import { ShieldCheck } from 'lucide-react';
import { PERSISTENT_DISCLAIMER } from '../shared/clinicalTypes';

interface TopNavProps {
  hasResult: boolean;
  onResetToIntake: () => void;
}

export function TopNav({ hasResult, onResetToIntake }: TopNavProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#intake"
          onClick={(e) => {
            if (hasResult) {
              e.preventDefault();
              onResetToIntake();
            }
          }}
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          MediMind
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {hasResult ? (
            <>
              <a
                href="#triage-findings"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Triage Findings
              </a>
              <a
                href="#terminology"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Medications &amp; Terms
              </a>
              <a
                href="#doctor-questions"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Doctor Questions
              </a>
              <button
                type="button"
                onClick={onResetToIntake}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Report Intake
              </button>
            </>
          ) : (
            <>
              <a
                href="#intake"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Report Intake
              </a>
              <a
                href="#how-it-works"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Verification Pipeline
              </a>
              <a
                href="#sample-reports"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Sample Reports
              </a>
              <a
                href="#submission-console"
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Upload &amp; Paste
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetToIntake}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            {hasResult ? 'Analyze New Report' : 'Upload Report'}
          </button>
        </div>
      </header>

      {/* Persistent non-negotiable educational disclaimer */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 sm:px-6 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-800 shrink-0" aria-hidden="true" />
            <span>{PERSISTENT_DISCLAIMER}</span>
          </div>
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap shrink-0">
            NCPL Meditech Safety-First Triage Layer · Stateless Session
          </span>
        </div>
      </div>
    </div>
  );
}
