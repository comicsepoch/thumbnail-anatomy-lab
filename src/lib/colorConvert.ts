import type { AlightMotionValues, Swatch } from "./types";

/**
 * Converts an RGB color into the Hue / Saturation / Brightness percentage
 * sliders used by Alight Motion's HSL adjustment effect (each slider runs
 * 0–100%, where Hue% maps the full 0–360° wheel and Saturation/Brightness
 * map directly to standard HSV S and V).
 */
export function rgbToAlightMotionValues(r: number, g: number, b: number): AlightMotionValues {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const v = max; // brightness/value
  const s = max === 0 ? 0 : d / max; // saturation

  return {
    huePercent: Math.round((h / 360) * 1000) / 10,
    saturationPercent: Math.round(s * 1000) / 10,
    brightnessPercent: Math.round(v * 1000) / 10,
  };
}

export function swatchToAlightMotion(s: Swatch): AlightMotionValues {
  return rgbToAlightMotionValues(s.rgb[0], s.rgb[1], s.rgb[2]);
}

/** Human-readable notes string, ready to paste into a notes app. */
export function buildAlightMotionNotes(swatches: Swatch[]): string {
  const lines = [
    "ALIGHT MOTION — HSL SLIDER VALUES",
    "(Add an HSL adjustment layer, dial these in per swatch)",
    "",
  ];
  swatches.forEach((s, i) => {
    const v = swatchToAlightMotion(s);
    lines.push(
      `${i + 1}. ${s.name} (${s.hex}) — Hue ${v.huePercent}%, Saturation ${v.saturationPercent}%, Brightness ${v.brightnessPercent}%`
    );
  });
  return lines.join("\n");
}
