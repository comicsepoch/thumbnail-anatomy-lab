"use client";

import { useState } from "react";
import { renderStudyCard, downloadDataUrl } from "@/lib/exportCard";
import type { ThumbnailItem } from "@/lib/types";
import { useCommandments } from "./CommandmentsSection";

export default function ExportCardButton({ item }: { item: ThumbnailItem }) {
  const [busy, setBusy] = useState(false);

  const commandments = useCommandments({
    ai: item.ai?.ok ? item.ai.data : undefined,
    palette: item.palette,
    textBlocks: item.textBlocks,
    width: item.width,
    height: item.height,
  });

  const handleExport = async () => {
    setBusy(true);
    try {
      const dataUrl = await renderStudyCard({
        imgSrc: item.objectUrl,
        fileName: item.fileName,
        palette: item.palette,
        fonts: item.ai?.ok ? item.ai.data.fonts : undefined,
        commandments,
        styleSummary: item.ai?.ok ? item.ai.data.verdict.styleSummary : undefined,
      });
      downloadDataUrl(dataUrl, `${item.fileName.replace(/\.[^.]+$/, "")}-study-card.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition hover:border-accent/60 hover:text-accent disabled:opacity-60"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? "Rendering…" : "Export Study Card"}
    </button>
  );
}
