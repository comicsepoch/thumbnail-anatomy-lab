import type { Hierarchy, TextBlock } from "./types";

interface TessWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TessLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: TessWord[];
}

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;
let currentLogger: ((p: number) => void) | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(async ({ createWorker }) => {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && currentLogger) {
            currentLogger(m.progress);
          }
        },
      });
      await worker.setParameters({ user_defined_dpi: "300" });
      return worker;
    });
  }
  return workerPromise;
}

/**
 * Thumbnails are small and use huge decorative display fonts, which plain
 * tesseract struggles with at native resolution. Upscaling meaningfully
 * improves character segmentation.
 */
function upscaleForOCR(img: HTMLImageElement): HTMLCanvasElement {
  const targetW = Math.max(img.naturalWidth, 1400);
  const ratio = targetW / img.naturalWidth;
  const w = Math.round(img.naturalWidth * ratio);
  const h = Math.round(img.naturalHeight * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
}

function collectLines(data: { blocks?: { paragraphs: { lines: TessLine[] }[] }[] } | null | undefined): TessLine[] {
  const lines: TessLine[] = [];
  for (const block of data?.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        lines.push(line);
      }
    }
  }
  return lines;
}

function alnumCount(s: string): number {
  return (s.match(/[a-zA-Z0-9]/g) || []).length;
}

function bboxOverlap(
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number }
): number {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  if (inter === 0) return 0;
  const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
  const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
  return inter / Math.min(areaA, areaB);
}

function classifyHierarchy(
  line: TessLine,
  maxHeightRatio: number,
  imgW: number,
  imgH: number
): Hierarchy {
  const h = line.bbox.y1 - line.bbox.y0;
  const heightRatio = h / imgH;
  const wordCount = line.words?.length || line.text.trim().split(/\s+/).length;
  const cleanText = line.text.trim();
  const isUpperShort =
    wordCount <= 3 && cleanText.length <= 16 && cleanText === cleanText.toUpperCase();

  const nearEdge =
    line.bbox.x0 < imgW * 0.1 ||
    line.bbox.x1 > imgW * 0.9 ||
    line.bbox.y0 < imgH * 0.12 ||
    line.bbox.y1 > imgH * 0.9;

  if (heightRatio >= 0.13 || heightRatio >= maxHeightRatio * 0.72) {
    return "headline";
  }
  if (isUpperShort && heightRatio < 0.09 && nearEdge) {
    return wordCount <= 2 ? "stamp" : "badge";
  }
  if (heightRatio >= 0.045) {
    return "subtext";
  }
  return isUpperShort ? "badge" : "subtext";
}

/**
 * Runs OCR against a thumbnail. Large decorative display fonts are a hard
 * case for tesseract, so we run two passes with different page-segmentation
 * strategies (whole-page layout vs. sparse isolated text) on an upscaled
 * copy of the image, then merge + de-duplicate the results for better
 * real-world coverage than a single pass.
 */
export async function runOCR(
  img: HTMLImageElement,
  imgW: number,
  imgH: number,
  onProgress?: (p: number) => void
): Promise<TextBlock[]> {
  const worker = await getWorker();
  currentLogger = onProgress ?? null;

  const canvas = upscaleForOCR(img);
  const scale = canvas.width / imgW;

  await worker.setParameters({ tessedit_pageseg_mode: "3" as never }); // AUTO
  const autoResult = await worker.recognize(canvas, {}, { blocks: true });
  onProgress?.(0.5);

  await worker.setParameters({ tessedit_pageseg_mode: "11" as never }); // SPARSE_TEXT
  const sparseResult = await worker.recognize(canvas, {}, { blocks: true });
  await worker.setParameters({ tessedit_pageseg_mode: "3" as never }); // reset to AUTO for next image
  currentLogger = null;
  onProgress?.(1);

  const autoLines = collectLines(autoResult.data as never);
  const sparseLines = collectLines(sparseResult.data as never);

  // AUTO (full-page layout analysis) is the more reliable pass, so it always
  // wins. SPARSE_TEXT (isolated-text mode) is only used to *fill gaps* for
  // regions AUTO found nothing in at all — large stylized headline text can
  // fragment into noisy single-word guesses, so we hold it to a higher bar.
  const autoFiltered = autoLines.filter((l) => {
    const text = l.text.trim();
    if (!text) return false;
    if (alnumCount(text) < 2) return false;
    if (l.confidence < 25) return false;
    return true;
  });

  const sparseFiltered = sparseLines.filter((l) => {
    const text = l.text.trim();
    if (!text) return false;
    if (alnumCount(text) < 3) return false;
    if (l.confidence < 45) return false;
    const heightRatio = (l.bbox.y1 - l.bbox.y0) / canvas.height;
    if (heightRatio < 0.02) return false;
    return true;
  });

  const merged: TessLine[] = [...autoFiltered];
  for (const line of sparseFiltered) {
    const overlapsExisting = merged.some((m) => bboxOverlap(m.bbox, line.bbox) > 0.15);
    if (!overlapsExisting) merged.push(line);
  }

  const filtered = merged;

  // Scale bboxes back down to the original image's coordinate space.
  const scaledLines = filtered.map((l) => ({
    ...l,
    bbox: {
      x0: l.bbox.x0 / scale,
      y0: l.bbox.y0 / scale,
      x1: l.bbox.x1 / scale,
      y1: l.bbox.y1 / scale,
    },
  }));

  const maxHeightRatio = scaledLines.reduce((acc, l) => {
    const r = (l.bbox.y1 - l.bbox.y0) / imgH;
    return Math.max(acc, r);
  }, 0.0001);

  const seen = new Set<string>();
  const textBlocks: TextBlock[] = [];
  scaledLines
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)
    .forEach((line, idx) => {
      const text = line.text.trim().replace(/\s+/g, " ");
      const dedupeKey = text.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      const heightRatio = (line.bbox.y1 - line.bbox.y0) / imgH;
      textBlocks.push({
        id: `t${idx}`,
        text,
        confidence: Math.round(line.confidence),
        heightRatio: Math.round(heightRatio * 1000) / 1000,
        bbox: line.bbox,
        hierarchy: classifyHierarchy(line, maxHeightRatio, imgW, imgH),
      });
    });

  // Headline first, then subtext, then badge/stamp, preserving relative order within groups
  const order: Record<Hierarchy, number> = { headline: 0, subtext: 1, badge: 2, stamp: 3 };
  textBlocks.sort((a, b) => order[a.hierarchy] - order[b.hierarchy]);

  return textBlocks;
}

export async function terminateOCRWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
