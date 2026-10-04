"use client";

import Dropzone from "@/components/Dropzone";
import KeyWarning from "@/components/KeyWarning";
import CompareStrip from "@/components/CompareStrip";
import AnalysisCard from "@/components/AnalysisCard";
import type { ThumbnailItem } from "@/lib/types";

export default function AnalyzeView({
  items,
  hasKey,
  onFiles,
  onRemove,
  onClearAll,
}: {
  items: ThumbnailItem[];
  hasKey: boolean | null;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <>
      {hasKey === false && <KeyWarning />}

      <Dropzone onFiles={onFiles} currentCount={items.length} />

      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-navy-500">
            {items.length} thumbnail{items.length !== 1 ? "s" : ""} loaded
          </p>
          <button
            onClick={onClearAll}
            className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-navy-400 transition hover:border-red-500/50 hover:text-red-400"
          >
            Clear all
          </button>
        </div>
      )}

      <CompareStrip items={items} />

      {items.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy-700 py-16 text-center">
          <p className="font-display text-lg text-navy-500">No thumbnails yet</p>
          <p className="max-w-sm text-sm text-navy-600">
            Upload 1–5 thumbnails above to start dissecting typography, color, and layout like a pro designer.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <AnalysisCard key={item.id} item={item} onRemove={onRemove} />
          ))}
        </div>
      )}
    </>
  );
}
