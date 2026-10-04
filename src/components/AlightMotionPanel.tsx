"use client";

import { useState } from "react";
import type { PaletteResult } from "@/lib/types";
import { buildAlightMotionNotes, swatchToAlightMotion } from "@/lib/colorConvert";

export default function AlightMotionPanel({ palette }: { palette: PaletteResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildAlightMotionNotes(palette.swatches));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!palette.swatches.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-navy-700 bg-navy-850/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
          Alight Motion HSL sliders
        </p>
        <button
          onClick={handleCopy}
          className="rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-[10px] font-medium text-white transition hover:border-accent/60 hover:text-accent"
        >
          {copied ? "Copied!" : "Copy as notes"}
        </button>
      </div>
      <ul className="space-y-1.5">
        {palette.swatches.map((s, i) => {
          const v = swatchToAlightMotion(s);
          return (
            <li key={i} className="flex items-center gap-2 text-[11px] text-navy-400">
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/20" style={{ backgroundColor: s.hex }} />
              <span className="text-navy-500">{s.hex}</span>
              <span className="ml-auto font-mono text-white/80">
                H {v.huePercent}% · S {v.saturationPercent}% · B {v.brightnessPercent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
