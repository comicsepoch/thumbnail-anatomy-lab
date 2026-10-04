"use client";

import { useMemo, useState } from "react";
import { simulateMobileLegibility, MOBILE_FEED_WIDTH } from "@/lib/mobileSim";
import type { TextBlock } from "@/lib/types";

export default function MobileSimSection({
  objectUrl,
  fileName,
  width,
  height,
  textBlocks,
}: {
  objectUrl: string;
  fileName: string;
  width: number;
  height: number;
  textBlocks: TextBlock[];
}) {
  const [glancing, setGlancing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const sim = useMemo(
    () => simulateMobileLegibility(width, height, textBlocks),
    [width, height, textBlocks]
  );

  const runGlanceTest = () => {
    setRevealed(false);
    setGlancing(true);
    window.setTimeout(() => {
      setGlancing(false);
      setRevealed(true);
    }, 500);
  };

  if (!width || !height) {
    return <p className="text-sm italic text-navy-500">Waiting for image to load…</p>;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {/* Mock mobile feed card */}
      <div className="shrink-0 rounded-2xl border border-navy-700 bg-navy-850 p-3" style={{ width: MOBILE_FEED_WIDTH + 24 }}>
        <div
          className="relative overflow-hidden rounded-lg bg-black"
          style={{ width: MOBILE_FEED_WIDTH, height: sim.displayHeight }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={objectUrl}
            alt={fileName}
            className="h-full w-full object-cover transition-[filter,opacity] duration-500"
            style={{ filter: glancing ? "blur(3px)" : "none" }}
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-medium text-white">
            12:34
          </span>
        </div>
        {/* YouTube-style metadata row under the thumbnail */}
        <div className="mt-2 flex gap-1.5">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-navy-600" />
          <div className="min-w-0 leading-tight">
            <p className="line-clamp-2 text-[9px] font-medium text-white/90">{fileName}</p>
            <p className="text-[8px] text-navy-500">Channel name · 1.2M views · 3 days ago</p>
          </div>
        </div>
      </div>

      {/* Legibility results */}
      <div className="flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            onClick={runGlanceTest}
            className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition hover:border-accent/60 hover:text-accent"
          >
            Run 0.5s glance test
          </button>
          {revealed && sim.headlinePass !== null && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                sim.headlinePass
                  ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-red-500/15 text-red-300 ring-red-500/30"
              }`}
            >
              Headline {sim.headlinePass ? "PASS" : "FAIL"}
            </span>
          )}
          {revealed && sim.headlinePass === null && (
            <span className="rounded-full bg-navy-700 px-2.5 py-1 text-[11px] text-navy-400 ring-1 ring-navy-600">
              No headline text to test
            </span>
          )}
        </div>
        <p className="mb-2 text-[11px] text-navy-500">
          Simulated at {sim.displayWidth}×{sim.displayHeight}px — the size this thumbnail actually renders at in the
          YouTube mobile feed.
        </p>
        {sim.blocks.length ? (
          <ul className="space-y-1.5">
            {sim.blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 rounded-lg bg-navy-850 px-2.5 py-1.5 text-[11px] ring-1 ring-navy-700"
              >
                <span className="rounded-full bg-navy-700 px-1.5 py-0.5 text-[9px] uppercase text-navy-400">
                  {b.hierarchy}
                </span>
                <span className="truncate text-navy-300">&ldquo;{b.text}&rdquo;</span>
                <span className="ml-auto shrink-0 font-mono text-navy-500">{b.scaledPx}px</span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    b.legible ? "bg-emerald-400/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {b.legible ? "PASS" : "FAIL"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-navy-500">No OCR text blocks to test.</p>
        )}
      </div>
    </div>
  );
}
