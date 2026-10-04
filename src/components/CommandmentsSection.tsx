"use client";

import { useMemo } from "react";
import { gradeCommandments } from "@/lib/commandments";
import { simulateMobileLegibility } from "@/lib/mobileSim";
import type { AIAnalysis, PaletteResult, TextBlock } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  warn: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  fail: "bg-red-500/15 text-red-300 ring-red-500/30",
};
const STATUS_ICON: Record<string, string> = { pass: "✅", warn: "⚠️", fail: "❌" };

export function useCommandments(opts: {
  ai?: AIAnalysis;
  palette?: PaletteResult;
  textBlocks?: TextBlock[];
  width: number;
  height: number;
}) {
  const { ai, palette, textBlocks = [], width, height } = opts;
  return useMemo(() => {
    const mobileSim = width && height ? simulateMobileLegibility(width, height, textBlocks) : undefined;
    return gradeCommandments({ ai, palette, textBlocks, mobileSim });
  }, [ai, palette, textBlocks, width, height]);
}

export default function CommandmentsSection({
  ai,
  palette,
  textBlocks,
  width,
  height,
}: {
  ai?: AIAnalysis;
  palette?: PaletteResult;
  textBlocks?: TextBlock[];
  width: number;
  height: number;
}) {
  const report = useCommandments({ ai, palette, textBlocks, width, height });

  const scoreColor =
    report.score >= 70 ? "text-emerald-300" : report.score >= 45 ? "text-amber-300" : "text-red-300";

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className={`font-display text-3xl font-bold ${scoreColor}`}>{report.score}</span>
        <span className="text-xs text-navy-500">/ 100 — thumbnail commandments score</span>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {report.rules.map((r) => (
          <li key={r.id} className="rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLE[r.status]}`}>
                {STATUS_ICON[r.status]} {r.status.toUpperCase()}
              </span>
              <span className="text-xs font-medium text-white/90">{r.label}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-navy-500">{r.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
