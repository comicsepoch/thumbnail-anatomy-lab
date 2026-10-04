import type { VaultEntry, VaultTags } from "./types";

const STORAGE_KEY = "tal.vault.v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadVault(): VaultEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VaultEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: VaultEntry[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    // Likely quota exceeded — surface to caller via thrown error so the UI
    // can tell the user to remove some entries or shrink images further.
    throw new Error(
      err instanceof Error && /quota/i.test(err.message)
        ? "Vault storage is full. Remove a few saved references and try again."
        : "Could not save to the vault in this browser."
    );
  }
}

function makeId() {
  return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function addVaultEntry(
  entry: Omit<VaultEntry, "id" | "savedAt">
): VaultEntry {
  const full: VaultEntry = { ...entry, id: makeId(), savedAt: Date.now() };
  const entries = loadVault();
  entries.unshift(full);
  persist(entries);
  return full;
}

export function updateVaultEntry(id: string, patch: Partial<VaultEntry>) {
  const entries = loadVault().map((e) => (e.id === id ? { ...e, ...patch } : e));
  persist(entries);
}

export function deleteVaultEntry(id: string) {
  persist(loadVault().filter((e) => e.id !== id));
}

export function searchVault(entries: VaultEntry[], query: string): VaultEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    const hay = [
      e.fileName,
      e.tags.channel,
      e.tags.niche,
      e.tags.style,
      e.ai?.ok ? e.ai.data.verdict.styleSummary : "",
      ...(e.textBlocks?.map((t) => t.text) ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export const EMPTY_TAGS: VaultTags = { channel: "", niche: "", style: "" };

/** Downscale + JPEG-compress an image to a small data URL before storing it
 * in localStorage, which has a small (usually ~5MB) quota per origin. */
export function compressForVault(img: HTMLImageElement, maxDim = 360, quality = 0.78): string {
  const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
