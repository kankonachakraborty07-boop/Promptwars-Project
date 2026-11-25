import { Check, ClipboardList, Copy, Plus, Printer } from 'lucide-react';
import React, { useState } from 'react';

interface DoctorQuestionsChecklistProps {
  initialQuestions: string[];
}

export function DoctorQuestionsChecklist({ initialQuestions }: DoctorQuestionsChecklistProps) {
  const [questions, setQuestions] = useState<string[]>(initialQuestions);
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const [newQuestion, setNewQuestion] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleItem = (idx: number) => {
    setCheckedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    setQuestions((prev) => [...prev, trimmed]);
    setNewQuestion('');
  };

  const handleCopy = async () => {
    const formatted = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section
      id="doctor-questions"
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start gap-2.5">
          <ClipboardList className="w-5 h-5 text-sky-800 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Questions for Your Next Doctor&apos;s Appointment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Check off questions to prioritize or add notes about symptoms you want to mention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 no-print shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy List</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      <ul className="space-y-2.5">
        {questions.map((question, idx) => {
          const isChecked = !!checkedMap[idx];
          return (
            <li key={idx}>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleItem(idx)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-800 focus:ring-sky-700"
                />
                <span
                  className={`text-sm leading-relaxed ${
                    isChecked ? 'text-slate-500 line-through' : 'text-slate-800'
                  }`}
                >
                  {question}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAddQuestion} className="flex items-center gap-2.5 no-print pt-1">
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Add a personal question or symptom note for your visit..."
          aria-label="Add custom appointment question"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Question</span>
        </button>
      </form>
    </section>
  );
}
