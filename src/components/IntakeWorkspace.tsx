import { FileText, Loader2, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { SAMPLE_REPORTS, SampleReport } from '../data/sampleReports';

interface IntakeWorkspaceProps {
  isAnalyzing: boolean;
  errorMessage: string | null;
  onAnalyzeFile: (file: File) => void;
  onAnalyzeText: (text: string) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
]);

export function IntakeWorkspace({
  isAnalyzing,
  errorMessage,
  onAnalyzeFile,
  onAnalyzeText,
}: IntakeWorkspaceProps) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndSelectFile = (file: File) => {
    setClientValidationError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExt = ['pdf', 'jpg', 'jpeg', 'png', 'txt'].includes(ext);

    if (!ACCEPTED_TYPES.has(file.type) && !validExt) {
      setClientValidationError(
        'Unsupported file format. Please select a PDF, JPG, PNG, or TXT file.'
      );
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setClientValidationError(
        `File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum supported size is 10 MB.`
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelectFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientValidationError(null);

    if (mode === 'upload') {
      if (!selectedFile) {
        setClientValidationError('Please choose a PDF, JPG, PNG, or TXT report file first.');
        return;
      }
      onAnalyzeFile(selectedFile);
      return;
    }

    const trimmed = pastedText.trim();
    if (trimmed.length < 15) {
      setClientValidationError(
        'Please paste at least one full lab line, prescription, or clinical note.'
      );
      return;
    }
    onAnalyzeText(trimmed);
  };

  const handleLoadSample = (sample: SampleReport) => {
    setClientValidationError(null);
    setMode('paste');
    setPastedText(sample.content);
    onAnalyzeText(sample.content);
  };

  const displayedError = clientValidationError || errorMessage;

  return (
    <section id="intake" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left editorial context & pipeline transparency */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-sky-800 tracking-wide">
              NCPL Meditech · Patient Report Triage
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
              Understand your lab reports and prescriptions in plain language
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Upload a lab PDF, scan, photo, or clinical note. MediMind checks numeric values
              against clinical reference thresholds first, explains terminology in everyday words,
              and prepares questions for your doctor.
            </p>
          </div>

          {/* Clean architectural 3-step pipeline summary */}
          <div id="how-it-works" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 scroll-mt-28">
            <h2 className="text-sm font-semibold text-slate-900">
              How every report is verified
            </h2>
            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 tabular-nums shrink-0">
                  01
                </span>
                <div>
                  <p className="font-medium text-slate-900">Document Extraction</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Parses PDF text or scanned images into structured test rows with verbatim source
                    quotes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 tabular-nums shrink-0">
                  02
                </span>
                <div>
                  <p className="font-medium text-slate-900">Deterministic Rule Engine</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Code-verified triage checks values against document ranges and critical-value
                    thresholds before AI explanation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 tabular-nums shrink-0">
                  03
                </span>
                <div>
                  <p className="font-medium text-slate-900">Safety-Validated Summary</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Output is scanned to block diagnoses or medication changes, and urgent flags
                    cannot be downgraded.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instant test samples */}
          <div id="sample-reports" className="space-y-2.5 scroll-mt-28">
            <p className="text-xs font-semibold text-slate-700">
              Try a de-identified sample report
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_REPORTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleLoadSample(sample)}
                  className="text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-300 rounded-lg px-4 py-3 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {sample.title}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                      {sample.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{sample.summaryHint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right clinical upload / paste console */}
        <div id="submission-console" className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Report Submission</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Processed in memory only · No medical records stored
              </p>
            </div>

            {/* Interactive mode segmented control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('upload');
                  setClientValidationError(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('paste');
                  setClientValidationError(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paste Report Text
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt,application/pdf,image/jpeg,image/png,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndSelectFile(f);
                  }}
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? 'border-sky-600 bg-sky-50/60'
                      : 'border-slate-300 hover:border-sky-500 bg-slate-50/60'
                  }`}
                >
                  <Upload className="w-8 h-8 text-sky-800 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-900">
                    Click to select or drag a medical report here
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Supports text PDF, scanned PDF, JPG, PNG, or TXT up to 10 MB
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-sky-800 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {(selectedFile.size / 1024).toFixed(1)} KB ·{' '}
                          {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      aria-label="Remove selected file"
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="report-text-input"
                  className="block text-sm font-medium text-slate-900 mb-2"
                >
                  Lab values, prescription label, or discharge text
                </label>
                <textarea
                  id="report-text-input"
                  rows={10}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Example:&#10;Potassium: 6.3 mmol/L (Ref: 3.5 - 5.0) CRITICAL&#10;Hemoglobin: 11.4 g/dL (Ref: 12.0 - 16.0) LOW&#10;Metformin ER 500 mg — Take 1 tablet once daily with dinner"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
                />
              </div>
            )}

            {displayedError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                {displayedError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">
                All findings include exact document quotes and deterministic triage checks.
              </p>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-800 hover:bg-sky-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Running Triage &amp; Interpretation...</span>
                  </>
                ) : (
                  <span>Interpret &amp; Triage Report</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
