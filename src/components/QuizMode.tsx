"use client";

import { useMemo, useState } from "react";
import { buildQuiz } from "@/lib/quiz";
import type { AIAnalysis, PaletteResult } from "@/lib/types";

export default function QuizMode({ ai, palette }: { ai?: AIAnalysis; palette?: PaletteResult }) {
  const questions = useMemo(() => buildQuiz(ai, palette), [ai, palette]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  if (!questions.length) {
    return <p className="text-sm italic text-navy-500">Not enough data yet to build a quiz for this thumbnail.</p>;
  }

  const revealedCount = Object.values(revealed).filter(Boolean).length;
  const correctCount = questions.filter(
    (q) => revealed[q.id] && answers[q.id] === q.correctAnswer
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500">Guess before you look — then reveal to check yourself.</p>
        {revealedCount > 0 && (
          <span className="rounded-full bg-navy-700 px-2.5 py-1 text-[11px] font-semibold text-accent ring-1 ring-navy-600">
            Score: {correctCount} / {revealedCount}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2.5">
        {questions.map((q) => {
          const isRevealed = Boolean(revealed[q.id]);
          const picked = answers[q.id];
          const correct = picked === q.correctAnswer;
          return (
            <li key={q.id} className="rounded-lg bg-navy-850 p-3 ring-1 ring-navy-700">
              <p className="mb-2 text-sm font-medium text-white/90">{q.prompt}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={picked ?? ""}
                  disabled={isRevealed}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs text-white disabled:opacity-70"
                >
                  <option value="" disabled>
                    Choose your guess…
                  </option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!picked || isRevealed}
                  onClick={() => setRevealed((prev) => ({ ...prev, [q.id]: true }))}
                  className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reveal
                </button>
                {isRevealed && (
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      correct ? "bg-emerald-400/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {correct ? "Correct!" : `Answer: ${q.correctAnswer}`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
