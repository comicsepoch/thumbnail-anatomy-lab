"use client";

import { useEffect, useMemo, useState } from "react";
import { compareThumbnails, type CompareSubject } from "@/lib/similarity";
import { loadVault } from "@/lib/vault";
import type { ThumbnailItem, VaultEntry } from "@/lib/types";

interface Option {
  id: string;
  label: string;
  thumb: string;
  subject: CompareSubject;
}

function itemToOption(item: ThumbnailItem): Option {
  return {
    id: `item-${item.id}`,
    label: `📷 ${item.fileName}`,
    thumb: item.objectUrl,
    subject: { palette: item.palette, textBlocks: item.textBlocks, ai: item.ai?.ok ? item.ai.data : undefined },
  };
}

function vaultToOption(entry: VaultEntry): Option {
  return {
    id: `vault-${entry.id}`,
    label: `⭐ ${entry.fileName}${entry.tags.channel ? ` (${entry.tags.channel})` : ""}`,
    thumb: entry.thumbDataUrl,
    subject: { palette: entry.palette, textBlocks: entry.textBlocks, ai: entry.ai?.ok ? entry.ai.data : undefined },
  };
}

function Bar({ label, percent }: { label: string; percent: number }) {
  const color = percent >= 70 ? "bg-emerald-400" : percent >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-navy-400">{label}</span>
        <span className="font-semibold text-white">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-navy-800">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function CompareView({ items }: { items: ThumbnailItem[] }) {
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [refId, setRefId] = useState("");
  const [remakeId, setRemakeId] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => setVaultEntries(loadVault()));
  }, []);

  const referenceOptions = useMemo(
    () => [...items.map(itemToOption), ...vaultEntries.map(vaultToOption)],
    [items, vaultEntries]
  );
  const remakeOptions = useMemo(() => items.map(itemToOption), [items]);

  const reference = referenceOptions.find((o) => o.id === refId);
  const remake = remakeOptions.find((o) => o.id === remakeId);

  const result = useMemo(() => {
    if (!reference || !remake) return null;
    return compareThumbnails(reference.subject, remake.subject);
  }, [reference, remake]);

  if (!items.length && !vaultEntries.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-700 py-16 text-center">
        <p className="font-display text-lg text-navy-500">Nothing to compare yet</p>
        <p className="max-w-sm text-sm text-navy-600">
          Analyze a reference thumbnail and your own remake in the Analyze tab (or save references to the Vault)
          first — then come back here to compare them side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-navy-700 bg-navy-900/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Reference (original)</p>
          <select
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-2 text-sm text-white"
          >
            <option value="">Choose a reference…</option>
            {referenceOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {reference && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reference.thumb} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
          )}
        </div>
        <div className="rounded-xl border border-navy-700 bg-navy-900/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Your remake</p>
          <select
            value={remakeId}
            onChange={(e) => setRemakeId(e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-2.5 py-2 text-sm text-white"
          >
            <option value="">Choose your remake…</option>
            {remakeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {remake && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={remake.thumb} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
          )}
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-navy-700 bg-navy-900/70 p-4">
          <p className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-accent">Match Report</p>
          <div className="flex flex-col gap-3">
            <Bar label="Palette match" percent={result.paletteMatchPercent} />
            <Bar label="Layout match" percent={result.layoutMatchPercent} />
          </div>
          <p className="mt-4 text-sm text-white/90">{result.fontMatchNote}</p>
          {result.differences.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-400">Top differences</p>
              <ul className="space-y-1.5">
                {result.differences.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-navy-300">
                    <span className="mt-0.5 text-accent">▸</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
