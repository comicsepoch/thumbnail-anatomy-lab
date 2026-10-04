"use client";

import { useEffect, useMemo, useState } from "react";
import { loadVault, deleteVaultEntry, updateVaultEntry, searchVault } from "@/lib/vault";
import type { VaultEntry } from "@/lib/types";

function EntryCard({ entry, onDelete, onUpdate }: { entry: VaultEntry; onDelete: (id: string) => void; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(entry.tags);

  const save = () => {
    updateVaultEntry(entry.id, { tags });
    setEditing(false);
    onUpdate();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-900/80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entry.thumbDataUrl} alt={entry.fileName} className="h-32 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-xs font-medium text-white" title={entry.fileName}>
          {entry.fileName}
        </p>
        {entry.commandments && (
          <span
            className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              entry.commandments.score >= 70
                ? "bg-emerald-400/15 text-emerald-300"
                : entry.commandments.score >= 45
                ? "bg-amber-400/15 text-amber-300"
                : "bg-red-500/15 text-red-300"
            }`}
          >
            Score {entry.commandments.score}/100
          </span>
        )}
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <input
              value={tags.channel}
              onChange={(e) => setTags((t) => ({ ...t, channel: e.target.value }))}
              placeholder="Channel"
              className="rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-[11px] text-white placeholder:text-navy-500"
            />
            <input
              value={tags.niche}
              onChange={(e) => setTags((t) => ({ ...t, niche: e.target.value }))}
              placeholder="Niche"
              className="rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-[11px] text-white placeholder:text-navy-500"
            />
            <input
              value={tags.style}
              onChange={(e) => setTags((t) => ({ ...t, style: e.target.value }))}
              placeholder="Style"
              className="rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-[11px] text-white placeholder:text-navy-500"
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setEditing(false)} className="text-[10px] text-navy-500 hover:text-white">
                Cancel
              </button>
              <button onClick={save} className="rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-navy-950">
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {[entry.tags.channel, entry.tags.niche, entry.tags.style].filter(Boolean).map((t, i) => (
              <span key={i} className="rounded-full bg-navy-700 px-2 py-0.5 text-[10px] text-navy-300">
                {t}
              </span>
            ))}
            {!entry.tags.channel && !entry.tags.niche && !entry.tags.style && (
              <span className="text-[10px] italic text-navy-600">No tags</span>
            )}
          </div>
        )}
        {entry.ai?.ok && (
          <p className="line-clamp-2 text-[11px] italic text-navy-500">{entry.ai.data.verdict.styleSummary}</p>
        )}
        <div className="mt-auto flex justify-between gap-2 pt-1">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-[11px] text-accent hover:underline">
              Edit tags
            </button>
          )}
          <button
            onClick={() => {
              deleteVaultEntry(entry.id);
              onDelete(entry.id);
            }}
            className="ml-auto text-[11px] text-red-400 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VaultView() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Deferred via a microtask so this reads as "subscribing to an external
    // store" rather than a synchronous setState-in-effect, matching the
    // project's existing fetch().then() pattern for client-only data loads.
    Promise.resolve().then(() => {
      setEntries(loadVault());
      setLoaded(true);
    });
  }, []);

  const filtered = useMemo(() => searchVault(entries, query), [entries, query]);

  const handleDelete = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  if (!loaded) return <p className="text-sm text-navy-500">Loading vault…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by channel, niche, style, or text…"
          className="w-full max-w-sm rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
        <span className="shrink-0 text-xs text-navy-500">{entries.length} saved</span>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-700 py-16 text-center">
          <p className="font-display text-lg text-navy-500">Your vault is empty</p>
          <p className="max-w-sm text-sm text-navy-600">
            Analyze a thumbnail in the Analyze tab, then hit &ldquo;Save to Vault&rdquo; to build a taggable reference
            library here — stored locally in this browser.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm italic text-navy-500">No saved references match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((e) => (
            <EntryCard key={e.id} entry={e} onDelete={handleDelete} onUpdate={() => setEntries(loadVault())} />
          ))}
        </div>
      )}
    </div>
  );
}
