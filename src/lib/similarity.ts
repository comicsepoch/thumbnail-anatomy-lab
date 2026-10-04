import type { AIAnalysis, PaletteResult, SimilarityResult, TextBlock } from "./types";

export interface CompareSubject {
  palette?: PaletteResult;
  textBlocks?: TextBlock[];
  ai?: AIAnalysis;
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

const MAX_RGB_DIST = Math.sqrt(3 * 255 ** 2);

function palettePercent(ref?: PaletteResult, remake?: PaletteResult): number {
  const a = ref?.swatches.slice(0, 4) ?? [];
  const b = remake?.swatches.slice(0, 4) ?? [];
  if (!a.length || !b.length) return 0;

  // For each reference swatch, find its closest match in the remake palette,
  // weighted by the reference swatch's share of the image.
  let weightedSim = 0;
  let totalWeight = 0;
  for (const sw of a) {
    const nearest = Math.min(...b.map((o) => colorDistance(sw.rgb, o.rgb)));
    const sim = Math.max(0, 1 - nearest / MAX_RGB_DIST);
    weightedSim += sim * sw.percent;
    totalWeight += sw.percent;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weightedSim / totalWeight) * 100);
}

function layoutKeyword(pattern: string): string {
  const p = pattern.toLowerCase();
  if (p.includes("thirds")) return "thirds";
  if (p.includes("mega-number") || p.includes("number")) return "mega-number";
  if (p.includes("plate")) return "plate";
  if (p.includes("split")) return "split";
  if (p.includes("centered") || p.includes("symmetric")) return "centered";
  return "other";
}

function layoutPercent(ref?: AIAnalysis, remake?: AIAnalysis, refBlocks: TextBlock[] = [], remakeBlocks: TextBlock[] = []): number {
  let achieved = 0;
  const total = 4;

  if (ref && remake) {
    if (ref.anatomy.facePresent === remake.anatomy.facePresent) achieved += 1;
    if (layoutKeyword(ref.anatomy.layoutPattern) === layoutKeyword(remake.anatomy.layoutPattern)) achieved += 1;
    const effA = new Set(ref.anatomy.effects.map((e) => e.toLowerCase()));
    const effB = new Set(remake.anatomy.effects.map((e) => e.toLowerCase()));
    const union = new Set([...effA, ...effB]);
    const overlap = [...effA].filter((e) => effB.has(e)).length;
    if (union.size === 0 || overlap / union.size >= 0.5) achieved += 1;
  } else {
    achieved += 1; // neutral, don't penalize missing AI data too harshly
  }

  if (Math.abs(refBlocks.length - remakeBlocks.length) <= 1) achieved += 1;

  return Math.round((achieved / total) * 100);
}

function fontMatchNote(ref?: AIAnalysis, remake?: AIAnalysis): string {
  if (!ref?.fonts.length || !remake?.fonts.length) {
    return "Not enough font data from both thumbnails to compare.";
  }
  const r = ref.fonts[0];
  const m = remake.fonts[0];
  const same = r.fontGuess.trim().toLowerCase() === m.fontGuess.trim().toLowerCase();
  const sameAlt = r.googleFontAlt.trim().toLowerCase() === m.googleFontAlt.trim().toLowerCase();
  if (same) return `Headline font matches closely: both read as ${r.fontGuess}.`;
  if (sameAlt) return `Different exact fonts but same free-alternative family (${r.googleFontAlt}) — close enough visually.`;
  return `Headline fonts differ: reference reads as ${r.fontGuess}, your remake reads as ${m.fontGuess}.`;
}

export function compareThumbnails(reference: CompareSubject, remake: CompareSubject): SimilarityResult {
  const paletteMatchPercent = palettePercent(reference.palette, remake.palette);
  const layoutMatchPercent = layoutPercent(reference.ai, remake.ai, reference.textBlocks, remake.textBlocks);
  const fontNote = fontMatchNote(reference.ai, remake.ai);

  const differences: string[] = [];

  if (paletteMatchPercent < 70) {
    const refBase = reference.palette?.distribution.base?.name;
    const remakeBase = remake.palette?.distribution.base?.name;
    differences.push(
      `Color palette diverges — reference leans ${refBase ?? "unknown"}, your remake leans ${remakeBase ?? "unknown"}.`
    );
  }
  if (layoutMatchPercent < 70 && reference.ai && remake.ai) {
    differences.push(
      `Layout differs — reference is "${reference.ai.anatomy.layoutPattern}" vs your remake's "${remake.ai.anatomy.layoutPattern}".`
    );
  }
  if (reference.ai && remake.ai && reference.ai.anatomy.facePresent !== remake.ai.anatomy.facePresent) {
    differences.push(
      reference.ai.anatomy.facePresent
        ? "Reference has a face as the focal point — your remake doesn't."
        : "Your remake adds a face the reference didn't have."
    );
  }
  if (fontNote.startsWith("Headline fonts differ")) {
    differences.push(fontNote);
  }
  const refCount = reference.textBlocks?.length ?? 0;
  const remakeCount = remake.textBlocks?.length ?? 0;
  if (Math.abs(refCount - remakeCount) > 1) {
    differences.push(`Text density differs — reference has ${refCount} text block(s), your remake has ${remakeCount}.`);
  }

  return {
    paletteMatchPercent,
    layoutMatchPercent,
    fontMatchNote: fontNote,
    differences: differences.slice(0, 3),
  };
}
