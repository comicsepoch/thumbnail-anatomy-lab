import type { AIFontGuess, CommandmentsReport, PaletteResult } from "./types";

export interface StudyCardInput {
  imgSrc: string;
  fileName: string;
  palette?: PaletteResult;
  fonts?: AIFontGuess[];
  commandments?: CommandmentsReport;
  styleSummary?: string;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const NAVY_BG = "#0b1220";
const NAVY_CARD = "#111a2e";
const NAVY_LINE = "#263352";
const ACCENT = "#ffd60a";
const WHITE = "#f4f6fb";
const MUTED = "#8a97b5";

/** Renders a shareable, portrait "study card" PNG summarizing one
 * thumbnail's analysis (image + palette + fonts + commandments score),
 * entirely on a canvas, and returns it as a data URL. */
export async function renderStudyCard(input: StudyCardInput): Promise<string> {
  const W = 1000;
  // Generous upper-bound height — content is variable (0-3 fonts, up to 6
  // rules), so we draw tall and crop to the actual content bottom at the end
  // rather than fighting with exact layout math up front.
  const H = 2000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0d1626");
  bgGrad.addColorStop(1, NAVY_BG);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = WHITE;
  ctx.font = "bold 40px Arial";
  ctx.fillText("Thumbnail Study Card", 48, 72);
  ctx.fillStyle = MUTED;
  ctx.font = "22px Arial";
  ctx.fillText(input.fileName.slice(0, 48), 48, 104);

  // Thumbnail image (letterboxed into a rounded panel)
  const imgPanelY = 136;
  const imgPanelH = 420;
  ctx.fillStyle = NAVY_CARD;
  roundRect(ctx, 48, imgPanelY, W - 96, imgPanelH, 20);
  ctx.fill();

  try {
    const img = await loadImg(input.imgSrc);
    const pad = 16;
    const boxW = W - 96 - pad * 2;
    const boxH = imgPanelH - pad * 2;
    const ratio = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const drawW = img.naturalWidth * ratio;
    const drawH = img.naturalHeight * ratio;
    const dx = 48 + pad + (boxW - drawW) / 2;
    const dy = imgPanelY + pad + (boxH - drawH) / 2;
    ctx.save();
    roundRect(ctx, 48 + pad, imgPanelY + pad, boxW, boxH, 12);
    ctx.clip();
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
  } catch {
    ctx.fillStyle = MUTED;
    ctx.font = "20px Arial";
    ctx.fillText("Image unavailable", 72, imgPanelY + imgPanelH / 2);
  }

  let y = imgPanelY + imgPanelH + 56;

  // Palette row
  ctx.fillStyle = WHITE;
  ctx.font = "bold 26px Arial";
  ctx.fillText("Color Palette", 48, y);
  y += 24;
  const swatches = input.palette?.swatches.slice(0, 6) ?? [];
  const swW = (W - 96 - (swatches.length - 1) * 14) / Math.max(swatches.length, 1);
  swatches.forEach((s, i) => {
    const x = 48 + i * (swW + 14);
    ctx.fillStyle = s.hex;
    roundRect(ctx, x, y, swW, 90, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, swW, 90, 12);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = "16px Arial";
    ctx.fillText(s.hex, x, y + 112);
  });
  y += swatches.length ? 150 : 40;

  // Fonts
  ctx.fillStyle = WHITE;
  ctx.font = "bold 26px Arial";
  ctx.fillText("Fonts", 48, y);
  y += 16;
  const fonts = input.fonts?.slice(0, 3) ?? [];
  if (!fonts.length) {
    ctx.fillStyle = MUTED;
    ctx.font = "20px Arial";
    y += 28;
    ctx.fillText("No fonts identified", 48, y);
    y += 20;
  } else {
    fonts.forEach((f) => {
      y += 36;
      ctx.fillStyle = NAVY_CARD;
      roundRect(ctx, 48, y - 26, W - 96, 44, 10);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.font = "20px Arial";
      ctx.fillText(`${f.label}: ${f.fontGuess}`, 64, y + 3);
      ctx.fillStyle = ACCENT;
      ctx.font = "16px Arial";
      const label = `free alt: ${f.googleFontAlt}`;
      ctx.fillText(label, W - 96 - ctx.measureText(label).width, y + 2);
    });
    y += 30;
  }

  y += 30;

  // Commandments score
  if (input.commandments) {
    const { score, rules } = input.commandments;
    const passCount = rules.filter((r) => r.status === "pass").length;

    ctx.fillStyle = WHITE;
    ctx.font = "bold 26px Arial";
    ctx.fillText("Commandments Score", 48, y);

    // Score circle — positioned fully below the header line (not overlapping
    // whatever was drawn above it).
    const radius = 72;
    const cx = W - 160;
    const cy = y + 40 + radius;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = NAVY_LINE;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score) / 100);
    ctx.strokeStyle = score >= 70 ? "#34d399" : score >= 45 ? ACCENT : "#f87171";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.fillStyle = WHITE;
    ctx.font = "bold 40px Arial";
    const scoreText = String(score);
    ctx.fillText(scoreText, cx - ctx.measureText(scoreText).width / 2, cy + 14);

    ctx.fillStyle = MUTED;
    ctx.font = "20px Arial";
    ctx.fillText(`${passCount} / ${rules.length} rules passed`, 48, cy + 8);

    y = cy + radius + 50;

    rules.slice(0, 6).forEach((r) => {
      y += 32;
      const icon = r.status === "pass" ? "PASS" : r.status === "warn" ? "WARN" : "FAIL";
      const color = r.status === "pass" ? "#34d399" : r.status === "warn" ? ACCENT : "#f87171";
      ctx.fillStyle = color;
      ctx.font = "bold 16px Arial";
      ctx.fillText(icon, 48, y);
      ctx.fillStyle = WHITE;
      ctx.font = "18px Arial";
      ctx.fillText(r.label, 110, y);
    });
  }

  // Footer — placed right after whatever content ended above it, then the
  // whole tall scratch canvas is cropped down to this actual content height.
  y += 50;
  ctx.fillStyle = MUTED;
  ctx.font = "16px Arial";
  ctx.fillText("Made with Thumbnail Anatomy Lab — for learning, not copying.", 48, y);

  const finalHeight = Math.min(H, y + 40);
  const cropped = document.createElement("canvas");
  cropped.width = W;
  cropped.height = finalHeight;
  const croppedCtx = cropped.getContext("2d");
  if (croppedCtx) {
    croppedCtx.drawImage(canvas, 0, 0, W, finalHeight, 0, 0, W, finalHeight);
    return cropped.toDataURL("image/png");
  }
  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
