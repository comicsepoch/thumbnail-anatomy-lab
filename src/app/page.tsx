"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dropzone from "@/components/Dropzone";
import KeyWarning from "@/components/KeyWarning";
import CompareStrip from "@/components/CompareStrip";
import AnalysisCard from "@/components/AnalysisCard";
import { extractPalette, loadImage, resizeToDataUrl } from "@/lib/colorExtract";
import { runOCR } from "@/lib/ocr";
import type { ThumbnailItem } from "@/lib/types";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const [items, setItems] = useState<ThumbnailItem[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/key-status")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKey)))
      .catch(() => setHasKey(false));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ThumbnailItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const processItem = useCallback(
    async (item: ThumbnailItem) => {
      try {
        const img = await loadImage(item.objectUrl);

        updateItem(item.id, {
          stage: "colors",
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        const palette = extractPalette(img, 6);
        updateItem(item.id, { palette });

        updateItem(item.id, { stage: "ocr", ocrProgress: 0 });
        let textBlocks: ThumbnailItem["textBlocks"];
        try {
          textBlocks = await runOCR(img, img.naturalWidth, img.naturalHeight, (p) =>
            updateItem(item.id, { ocrProgress: p })
          );
        } catch (ocrErr) {
          console.error("OCR failed", ocrErr);
          textBlocks = [];
        }
        updateItem(item.id, { textBlocks });

        updateItem(item.id, { stage: "ai" });
        try {
          const { dataUrl } = resizeToDataUrl(img, 1536, 0.92);
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          const json = await res.json();
          if (json.ok) {
            updateItem(item.id, { ai: { ok: true, data: json.data } });
          } else {
            updateItem(item.id, {
              ai: { ok: false, reason: json.reason ?? "error", message: json.message },
            });
          }
        } catch (err) {
          updateItem(item.id, {
            ai: { ok: false, reason: "error", message: err instanceof Error ? err.message : "Network error" },
          });
        }

        updateItem(item.id, { stage: "done" });
      } catch (err) {
        updateItem(item.id, {
          stage: "error",
          error: err instanceof Error ? err.message : "Something went wrong analyzing this image.",
        });
      }
    },
    [updateItem]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const newItems: ThumbnailItem[] = files.map((file) => ({
        id: makeId(),
        file,
        fileName: file.name,
        objectUrl: URL.createObjectURL(file),
        width: 0,
        height: 0,
        stage: "idle",
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    []
  );

  useEffect(() => {
    items.forEach((item) => {
      if (!processedRef.current.has(item.id) && item.stage === "idle") {
        processedRef.current.add(item.id);
        processItem(item);
      }
    });
  }, [items, processItem]);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((i) => i.id !== id);
    });
    processedRef.current.delete(id);
  }, []);

  const handleClearAll = useCallback(() => {
    items.forEach((i) => URL.revokeObjectURL(i.objectUrl));
    processedRef.current.clear();
    setItems([]);
  }, [items]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-navy-950 shadow-[0_0_24px_-4px_rgba(255,214,10,0.6)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="m10.5 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Thumbnail Anatomy Lab
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-navy-500 sm:text-base">
          Drop in up to 5 YouTube thumbnails and get a full design breakdown — extracted text, dominant colors,
          font guesses, composition anatomy, text treatment and a design verdict you can take into your next edit.
        </p>
      </header>

      {hasKey === false && <KeyWarning />}

      <Dropzone onFiles={handleFiles} currentCount={items.length} />

      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-navy-500">
            {items.length} thumbnail{items.length !== 1 ? "s" : ""} loaded
          </p>
          <button
            onClick={handleClearAll}
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
            <AnalysisCard key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <footer className="mt-10 border-t border-navy-800 pt-5 text-center text-[11px] text-navy-600">
        Colors &amp; OCR run fully client-side. Font / anatomy / verdict call a vision model server-side using your
        own API key. Built for learning thumbnail design, not for copying creators&apos; work verbatim.
      </footer>
    </main>
  );
}
