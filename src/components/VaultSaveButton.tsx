"use client";

import { useState } from "react";
import { addVaultEntry, compressForVault, EMPTY_TAGS } from "@/lib/vault";
import { loadImage } from "@/lib/colorExtract";
import type { ThumbnailItem, VaultTags } from "@/lib/types";
import { useCommandments } from "./CommandmentsSection";

export default function VaultSaveButton({ item }: { item: ThumbnailItem }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<VaultTags>(EMPTY_TAGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commandments = useCommandments({
    ai: item.ai?.ok ? item.ai.data : undefined,
    palette: item.palette,
    textBlocks: item.textBlocks,
    width: item.width,
    height: item.height,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const img = await loadImage(item.objectUrl);
      const thumbDataUrl = compressForVault(img, 360, 0.78);
      addVaultEntry({
        fileName: item.fileName,
        thumbDataUrl,
        width: item.width,
        height: item.height,
        tags,
        palette: item.palette,
        textBlocks: item.textBlocks,
        ai: item.ai,
        commandments,
      });
      setSaved(true);
      setTimeout(() => {
        setOpen(false);
        setSaved(false);
        setTags(EMPTY_TAGS);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to vault.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition hover:border-accent/60 hover:text-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path d="M6 4h12v16l-6-3.5L6 20V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        Save to Vault
      </button>
      {open && (
        // Fixed overlay (not absolute-inside-card) so it isn't clipped by the
        // analysis card's `overflow-hidden` rounded corners.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-xl border border-navy-600 bg-navy-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-white/90">Tag this reference</p>
            <div className="flex flex-col gap-2">
              <input
                value={tags.channel}
                onChange={(e) => setTags((t) => ({ ...t, channel: e.target.value }))}
                placeholder="Channel (e.g. MrBeast)"
                className="rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs text-white placeholder:text-navy-500"
              />
              <input
                value={tags.niche}
                onChange={(e) => setTags((t) => ({ ...t, niche: e.target.value }))}
                placeholder="Niche (e.g. gaming, ed-tech)"
                className="rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs text-white placeholder:text-navy-500"
              />
              <input
                value={tags.style}
                onChange={(e) => setTags((t) => ({ ...t, style: e.target.value }))}
                placeholder="Style (e.g. cinematic, mega-number)"
                className="rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-1.5 text-xs text-white placeholder:text-navy-500"
              />
            </div>
            {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-navy-600 px-2.5 py-1.5 text-[11px] text-navy-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-navy-950 transition hover:brightness-95 disabled:opacity-60"
              >
                {saved ? "Saved!" : saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
