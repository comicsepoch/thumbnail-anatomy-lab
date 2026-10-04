import type { ThumbnailItem } from "./types";

export function buildReportText(item: ThumbnailItem): string {
  const lines: string[] = [];
  lines.push(`THUMBNAIL ANATOMY REPORT — ${item.fileName}`);
  lines.push("=".repeat(44));

  lines.push("\n1. EXTRACTED TEXT");
  if (item.textBlocks && item.textBlocks.length) {
    item.textBlocks.forEach((t) => {
      lines.push(`  [${t.hierarchy.toUpperCase()}] "${t.text}" (ocr conf ${t.confidence}%)`);
    });
  } else {
    lines.push("  No text detected.");
  }

  lines.push("\n2. COLOR PALETTE");
  if (item.palette?.swatches.length) {
    item.palette.swatches.forEach((s) => {
      lines.push(`  ${s.hex}  ${s.percent}%  — ${s.name}`);
    });
    const { base, secondary, accent } = item.palette.distribution;
    lines.push(
      `  60-30-10 guide: base ≈ ${base?.hex ?? "—"} (${base?.name ?? ""}), secondary ≈ ${
        secondary?.hex ?? "—"
      } (${secondary?.name ?? ""}), accent ≈ ${accent?.hex ?? "—"} (${accent?.name ?? ""})`
    );
  } else {
    lines.push("  Palette not extracted.");
  }

  lines.push("\n3. FONT IDENTIFICATION");
  if (item.ai?.ok && item.ai.data.fonts.length) {
    item.ai.data.fonts.forEach((f) => {
      lines.push(
        `  ${f.label}: ${f.fontGuess} (confidence: ${f.confidence}) — free alt: ${f.googleFontAlt}`
      );
    });
  } else {
    lines.push("  Unavailable (AI vision step was not run or returned no data).");
  }

  lines.push("\n4. VISUAL ANATOMY");
  if (item.ai?.ok) {
    const a = item.ai.data.anatomy;
    lines.push(`  Face present: ${a.facePresent ? "yes" : "no"}`);
    lines.push(`  Expression: ${a.expression}`);
    lines.push(`  Pointing/gesture: ${a.pointingDirection}`);
    lines.push(`  Props: ${a.props.join(", ") || "none"}`);
    lines.push(`  Background: ${a.backgroundType}`);
    lines.push(`  Effects: ${a.effects.join(", ") || "none"}`);
    lines.push(`  Layout pattern: ${a.layoutPattern}`);
  } else {
    lines.push("  Unavailable (AI vision step was not run or returned no data).");
  }

  lines.push("\n5. TEXT TREATMENT");
  if (item.ai?.ok && item.ai.data.textTreatment.length) {
    item.ai.data.textTreatment.forEach((t) => {
      lines.push(
        `  ${t.label}: color ${t.color}, stroke=${t.stroke ? "yes" : "no"}, italic/skew=${
          t.italicOrSkew ? "yes" : "no"
        }, size: ${t.sizeRelation}`
      );
    });
  } else {
    lines.push("  Unavailable (AI vision step was not run or returned no data).");
  }

  lines.push("\n6. DESIGN VERDICT");
  if (item.ai?.ok) {
    lines.push(`  ${item.ai.data.verdict.styleSummary}`);
    item.ai.data.verdict.tips.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  } else {
    lines.push("  Unavailable (AI vision step was not run or returned no data).");
  }

  return lines.join("\n");
}
