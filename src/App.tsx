import { useState } from 'react';
import { DoctorQuestionsChecklist } from './components/DoctorQuestionsChecklist';
import { EmergencyEscalationPanel } from './components/EmergencyEscalationPanel';
import { FindingsTableAndCards } from './components/FindingsTableAndCards';
import { IntakeWorkspace } from './components/IntakeWorkspace';
import { MedicationsAndGlossary } from './components/MedicationsAndGlossary';
import { TopNav } from './components/TopNav';
import { TriageSummaryStrip } from './components/TriageSummaryStrip';
import { AnalysisResponse, PERSISTENT_DISCLAIMER } from './shared/clinicalTypes';

export default function App() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not interpret this file.');
      }

      setAnalysis(data as AnalysisResponse);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while analyzing.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeText = async (text: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not interpret this report text.');
      }

      setAnalysis(data as AnalysisResponse);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while analyzing.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetToIntake = () => {
    setAnalysis(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav hasResult={analysis !== null} onResetToIntake={handleResetToIntake} />

      <main className="flex-1">
        {analysis === null ? (
          <IntakeWorkspace
            isAnalyzing={isAnalyzing}
            errorMessage={errorMessage}
            onAnalyzeFile={handleAnalyzeFile}
            onAnalyzeText={handleAnalyzeText}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <EmergencyEscalationPanel escalation={analysis.urgent_escalation} />

            <TriageSummaryStrip analysis={analysis} />

            <FindingsTableAndCards findings={analysis.findings} />

            <MedicationsAndGlossary
              medications={analysis.medications}
              terminology={analysis.terminology}
            />

            <DoctorQuestionsChecklist
              key={analysis.plain_summary}
              initialQuestions={analysis.doctor_questions}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">{PERSISTENT_DISCLAIMER}</p>
          <p>MediMind · NCPL Meditech Clinical Triage Architecture · Stateless &amp; Privacy-First</p>
        </div>
      </footer>
    </div>
  );
}
