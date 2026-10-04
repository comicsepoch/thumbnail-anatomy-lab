"use client";

import { useState } from "react";
import type { Hierarchy, ThumbnailItem } from "@/lib/types";
import StageBadge from "./StageBadge";
import { buildReportText } from "@/lib/report";
import AlightMotionPanel from "./AlightMotionPanel";
import MobileSimSection from "./MobileSimSection";
import CommandmentsSection from "./CommandmentsSection";
import FontSourceLink from "./FontSourceLink";
import QuizMode from "./QuizMode";
import VaultSaveButton from "./VaultSaveButton";
import ExportCardButton from "./ExportCardButton";

const HIERARCHY_STYLE: Record<Hierarchy, string> = {
  headline: "bg-accent/15 text-accent ring-accent/40",
  subtext: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  badge: "bg-fuchsia-400/15 text-fuchsia-300 ring-fuchsia-400/30",
  stamp: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
};

function SectionHeader({ n, title }: { n: number | string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-accent ring-1 ring-navy-600">
        {n}
      </span>
      <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white/90">
        {title}
      </h3>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm italic text-navy-500">{text}</p>;
}

export default function AnalysisCard({
  item,
  onRemove,
}: {
  item: ThumbnailItem;
  onRemove: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText(item));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const aiReady = item.ai?.ok;
  const aiNoKey = item.ai && !item.ai.ok && item.ai.reason === "no_key";
  const aiError = item.ai && !item.ai.ok && item.ai.reason === "error";

  return (
    <div className="animate-fade-in overflow-hidden rounded-2xl border border-navy-700 bg-navy-900/80 shadow-lg shadow-black/20">
      {/* Card header */}
      <div className="flex flex-col gap-3 border-b border-navy-700 bg-navy-850 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.objectUrl}
            alt={item.fileName}
            className="h-14 w-24 shrink-0 rounded-lg object-cover ring-1 ring-navy-600"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-medium text-white" title={item.fileName}>
              {item.fileName}
            </p>
            <p className="text-xs text-navy-500">
              {item.width}×{item.height}px
            </p>
            <div className="mt-1">
              <StageBadge stage={item.stage} ocrProgress={item.ocrProgress} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
          <VaultSaveButton item={item} />
          <ExportCardButton item={item} />
          <button
            onClick={() => setQuizMode((q) => !q)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              quizMode
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-navy-600 bg-navy-800 text-white hover:border-accent/60 hover:text-accent"
            }`}
          >
            {quizMode ? "Exit Quiz" : "Quiz Mode"}
          </button>
          <button
            onClick={handleCopy}
            disabled={item.stage === "idle"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <rect x="9" y="9" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Copy analysis
              </>
            )}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="rounded-lg border border-navy-600 bg-navy-800 p-1.5 text-navy-500 transition hover:border-red-500/50 hover:text-red-400"
            title="Remove"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {item.error && (
        <div className="m-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/30">
          {item.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-2">
        {/* 1. Extracted text */}
        <div>
          <SectionHeader n={1} title="Extracted Text" />
          <p className="-mt-1.5 mb-2.5 text-[11px] text-navy-600">
            OCR via tesseract.js — big decorative headline fonts can be partially misread; treat low-confidence lines as approximate.
          </p>
          {item.stage === "idle" || item.stage === "colors" ? (
            <EmptyNote text="Waiting for OCR…" />
          ) : item.textBlocks && item.textBlocks.length ? (
            <ul className="space-y-2">
              {item.textBlocks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-navy-850 px-3 py-2 ring-1 ring-navy-700">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${HIERARCHY_STYLE[t.hierarchy]}`}>
                    {t.hierarchy}
                  </span>
                  <span className="text-sm text-white/90">&ldquo;{t.text}&rdquo;</span>
                  <span className="ml-auto text-[10px] text-navy-500">{t.confidence}% conf.</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote text="No text detected on this thumbnail." />
          )}
        </div>

        {/* 2. Color palette */}
        <div>
          <SectionHeader n={2} title="Color Palette" />
          {quizMode ? (
            <div className="rounded-lg border border-dashed border-navy-700 bg-navy-850/50 p-3 text-center">
              <p className="text-xs text-navy-500">Palette hidden while Quiz Mode is on — guess in the quiz below.</p>
            </div>
          ) : item.palette?.swatches.length ? (
            <>
              <AlightMotionPanel palette={item.palette} />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.palette.swatches.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-navy-850 p-2 ring-1 ring-navy-700">
                    <span
                      className="h-8 w-8 shrink-0 rounded-md ring-1 ring-black/30"
                      style={{ backgroundColor: s.hex }}
                    />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[11px] font-semibold text-white">{s.hex}</p>
                      <p className="truncate text-[10px] text-navy-500" title={s.name}>
                        {s.name} · {s.percent}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed text-navy-500">
                <span className="font-semibold text-navy-400">60-30-10 guide —</span>
                <span className="inline-flex items-center gap-1">
                  base:
                  {item.palette.distribution.base && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: item.palette.distribution.base.hex }}
                    />
                  )}
                  <span className="font-medium text-white/90">{item.palette.distribution.base?.name ?? "—"}</span>
                </span>
                <span>,</span>
                <span className="inline-flex items-center gap-1">
                  secondary:
                  {item.palette.distribution.secondary && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: item.palette.distribution.secondary.hex }}
                    />
                  )}
                  <span className="font-medium text-white/90">{item.palette.distribution.secondary?.name ?? "—"}</span>
                </span>
                <span>,</span>
                <span className="inline-flex items-center gap-1">
                  accent:
                  {item.palette.distribution.accent && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: item.palette.distribution.accent.hex }}
                    />
                  )}
                  <span className="font-medium text-white/90">{item.palette.distribution.accent?.name ?? "—"}</span>
                </span>
              </p>
            </>
          ) : (
            <EmptyNote text="Extracting palette…" />
          )}
        </div>

        {/* 3. Font identification */}
        <div>
          <SectionHeader n={3} title="Font Identification" />
          {quizMode ? (
            <div className="rounded-lg border border-dashed border-navy-700 bg-navy-850/50 p-3 text-center">
              <p className="text-xs text-navy-500">Fonts hidden while Quiz Mode is on — guess in the quiz below.</p>
            </div>
          ) : aiReady && item.ai!.ok && item.ai!.data.fonts.length ? (
            <ul className="space-y-2">
              {item.ai!.data.fonts.map((f, i) => (
                <li key={i} className="rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-navy-400">{f.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${
                        f.confidence === "high"
                          ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                          : f.confidence === "medium"
                          ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
                          : "bg-navy-700 text-navy-400 ring-navy-600"
                      }`}
                    >
                      {f.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">{f.fontGuess}</p>
                  <p className="text-xs text-navy-500">
                    Free alt: <span className="text-accent">{f.googleFontAlt}</span>
                  </p>
                  <FontSourceLink fontGuess={f.fontGuess} googleFontAlt={f.googleFontAlt} />
                </li>
              ))}
            </ul>
          ) : aiNoKey ? (
            <EmptyNote text="Needs an AI vision API key (see banner above)." />
          ) : aiError ? (
            <EmptyNote text={`AI step failed: ${item.ai && !item.ai.ok ? item.ai.message : "unknown error"}`} />
          ) : item.stage === "ai" ? (
            <EmptyNote text="Asking the vision model…" />
          ) : aiReady ? (
            <EmptyNote text="No distinct text blocks to identify fonts for." />
          ) : (
            <EmptyNote text="Waiting…" />
          )}
        </div>

        {/* 4. Visual anatomy */}
        <div>
          <SectionHeader n={4} title="Visual Anatomy" />
          {aiReady && item.ai!.ok ? (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Face present</dt>
                <dd className="mt-0.5 font-medium text-white">
                  {item.ai!.data.anatomy.facePresent ? "Yes" : "No"}
                  {item.ai!.data.anatomy.facePresent ? ` — ${item.ai!.data.anatomy.expression}` : ""}
                </dd>
              </div>
              <div className="rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Pointing / gesture</dt>
                <dd className="mt-0.5 font-medium text-white">{item.ai!.data.anatomy.pointingDirection}</dd>
              </div>
              <div className="rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Background</dt>
                <dd className="mt-0.5 font-medium text-white">{item.ai!.data.anatomy.backgroundType}</dd>
              </div>
              <div className="col-span-2 rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Props</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1.5">
                  {item.ai!.data.anatomy.props.length ? (
                    item.ai!.data.anatomy.props.map((p, i) => (
                      <span key={i} className="rounded-full bg-navy-700 px-2 py-0.5 text-[10px] text-white/90">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-navy-500">none</span>
                  )}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Effects detected</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1.5">
                  {item.ai!.data.anatomy.effects.length ? (
                    item.ai!.data.anatomy.effects.map((p, i) => (
                      <span key={i} className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent ring-1 ring-accent/30">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-navy-500">none</span>
                  )}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg bg-navy-850 p-2.5 ring-1 ring-navy-700">
                <dt className="text-navy-500">Layout pattern</dt>
                <dd className="mt-0.5 font-medium text-white">{item.ai!.data.anatomy.layoutPattern}</dd>
              </div>
            </dl>
          ) : aiNoKey ? (
            <EmptyNote text="Needs an AI vision API key (see banner above)." />
          ) : aiError ? (
            <EmptyNote text="AI step failed — see font section for details." />
          ) : item.stage === "ai" ? (
            <EmptyNote text="Asking the vision model…" />
          ) : (
            <EmptyNote text="Waiting…" />
          )}
        </div>

        {/* 5. Text treatment */}
        <div className="lg:col-span-2">
          <SectionHeader n={5} title="Text Treatment" />
          {aiReady && item.ai!.ok && item.ai!.data.textTreatment.length ? (
            <div className="overflow-x-auto rounded-lg ring-1 ring-navy-700">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-navy-850 text-navy-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Block</th>
                    <th className="px-3 py-2 font-medium">Color</th>
                    <th className="px-3 py-2 font-medium">Stroke</th>
                    <th className="px-3 py-2 font-medium">Italic/skew</th>
                    <th className="px-3 py-2 font-medium">Size relation</th>
                  </tr>
                </thead>
                <tbody>
                  {item.ai!.data.textTreatment.map((t, i) => (
                    <tr key={i} className="border-t border-navy-700 bg-navy-900/60">
                      <td className="px-3 py-2 font-medium text-white">{t.label}</td>
                      <td className="px-3 py-2 text-navy-300">{t.color}</td>
                      <td className="px-3 py-2 text-navy-300">{t.stroke ? "Yes" : "No"}</td>
                      <td className="px-3 py-2 text-navy-300">{t.italicOrSkew ? "Yes" : "No"}</td>
                      <td className="px-3 py-2 text-navy-300">{t.sizeRelation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : aiNoKey ? (
            <EmptyNote text="Needs an AI vision API key (see banner above)." />
          ) : aiError ? (
            <EmptyNote text="AI step failed — see font section for details." />
          ) : item.stage === "ai" ? (
            <EmptyNote text="Asking the vision model…" />
          ) : (
            <EmptyNote text="Waiting…" />
          )}
        </div>

        {/* 6. Design verdict */}
        <div className="lg:col-span-2">
          <SectionHeader n={6} title="Design Verdict" />
          {aiReady && item.ai!.ok ? (
            <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4">
              <p className="font-display text-base font-semibold text-accent">
                {item.ai!.data.verdict.styleSummary}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/90">
                {item.ai!.data.verdict.tips.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-accent">▸</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-navy-500">
                via {item.ai!.data.provider}
              </p>
            </div>
          ) : aiNoKey ? (
            <EmptyNote text="Needs an AI vision API key (see banner above)." />
          ) : aiError ? (
            <EmptyNote text="AI step failed — see font section for details." />
          ) : item.stage === "ai" ? (
            <EmptyNote text="Asking the vision model…" />
          ) : (
            <EmptyNote text="Waiting…" />
          )}
        </div>

        {/* Quiz mode */}
        {quizMode && (
          <div className="lg:col-span-2">
            <SectionHeader n="?" title="Guess the Font & Color Quiz" />
            <QuizMode ai={item.ai?.ok ? item.ai.data : undefined} palette={item.palette} />
          </div>
        )}

        {/* 7. Phone-size readability simulator */}
        <div className="lg:col-span-2">
          <SectionHeader n={7} title="Mobile Readability Simulator" />
          <MobileSimSection
            objectUrl={item.objectUrl}
            fileName={item.fileName}
            width={item.width}
            height={item.height}
            textBlocks={item.textBlocks ?? []}
          />
        </div>

        {/* 8. Thumbnail commandments checklist */}
        <div className="lg:col-span-2">
          <SectionHeader n={8} title="Thumbnail Commandments" />
          <CommandmentsSection
            ai={item.ai?.ok ? item.ai.data : undefined}
            palette={item.palette}
            textBlocks={item.textBlocks}
            width={item.width}
            height={item.height}
          />
        </div>
      </div>
    </div>
  );
}
