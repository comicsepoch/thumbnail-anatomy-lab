import { describeColor, rgbToHex } from "./colorNames";
import type { PaletteResult, Swatch } from "./types";

const BUCKET = 24; // quantization step per channel, keeps similar colors grouped

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

/**
 * Extracts the top N dominant colors from an image using client-side
 * canvas pixel sampling (no backend). Downsamples first for speed, then
 * buckets similar pixel colors together before ranking by frequency.
 */
export function extractPalette(
  img: HTMLImageElement,
  topN = 6
): PaletteResult {
  const maxDim = 140;
  const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { swatches: [], distribution: { base: null, secondary: null, accent: null } };
  }
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);

  const buckets = new Map<
    string,
    { count: number; rSum: number; gSum: number; bSum: number }
  >();

  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 100) continue; // skip transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / BUCKET)}-${Math.round(g / BUCKET)}-${Math.round(b / BUCKET)}`;
    const entry = buckets.get(key);
    if (entry) {
      entry.count++;
      entry.rSum += r;
      entry.gSum += g;
      entry.bSum += b;
    } else {
      buckets.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
    total++;
  }

  if (total === 0) {
    return { swatches: [], distribution: { base: null, secondary: null, accent: null } };
  }

  const candidates = Array.from(buckets.values())
    .map((v) => ({
      rgb: [
        Math.round(v.rSum / v.count),
        Math.round(v.gSum / v.count),
        Math.round(v.bSum / v.count),
      ] as [number, number, number],
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);

  // Merge visually-similar candidates so the top list isn't full of near-duplicates
  const merged: { rgb: [number, number, number]; count: number }[] = [];
  const MERGE_THRESHOLD = 26;
  for (const c of candidates) {
    const close = merged.find((m) => colorDistance(m.rgb, c.rgb) < MERGE_THRESHOLD);
    if (close) {
      const combinedCount = close.count + c.count;
      close.rgb = [
        Math.round((close.rgb[0] * close.count + c.rgb[0] * c.count) / combinedCount),
        Math.round((close.rgb[1] * close.count + c.rgb[1] * c.count) / combinedCount),
        Math.round((close.rgb[2] * close.count + c.rgb[2] * c.count) / combinedCount),
      ];
      close.count = combinedCount;
    } else {
      merged.push({ rgb: c.rgb, count: c.count });
    }
  }

  merged.sort((a, b) => b.count - a.count);
  const top = merged.slice(0, topN);

  const swatches: Swatch[] = top.map((t) => ({
    hex: rgbToHex(t.rgb[0], t.rgb[1], t.rgb[2]),
    rgb: t.rgb,
    percent: Math.round((t.count / total) * 1000) / 10,
    name: describeColor(t.rgb[0], t.rgb[1], t.rgb[2]),
  }));

  return {
    swatches,
    distribution: {
      base: swatches[0] ?? null,
      secondary: swatches[1] ?? null,
      accent: swatches[2] ?? null,
    },
  };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Resize an image to a max dimension and return a base64 data URL + mime. */
export function resizeToDataUrl(
  img: HTMLImageElement,
  maxDim = 1024,
  quality = 0.85
): { dataUrl: string; mime: string } {
  const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, w, h);
  const mime = "image/jpeg";
  return { dataUrl: canvas.toDataURL(mime, quality), mime };
}
