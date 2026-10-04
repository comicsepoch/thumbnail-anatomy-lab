function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hueName(h: number): string {
  const ranges: [number, number, string][] = [
    [0, 10, "red"],
    [10, 22, "red-orange"],
    [22, 40, "orange"],
    [40, 52, "amber"],
    [52, 65, "yellow"],
    [65, 80, "yellow-green"],
    [80, 140, "green"],
    [140, 165, "emerald green"],
    [165, 185, "teal"],
    [185, 200, "cyan"],
    [200, 220, "sky blue"],
    [220, 240, "blue"],
    [240, 258, "indigo"],
    [258, 280, "violet"],
    [280, 305, "purple"],
    [305, 325, "magenta"],
    [325, 345, "pink"],
    [345, 360, "red"],
  ];
  for (const [lo, hi, name] of ranges) {
    if (h >= lo && h < hi) return name;
  }
  return "red";
}

/**
 * Produce a human-friendly descriptive color name like
 * "deep navy blue" or "bright amber yellow" from an RGB triple.
 */
export function describeColor(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b);

  // Achromatic / near-grayscale handling
  if (s < 8) {
    if (l < 10) return "near-black";
    if (l < 25) return "charcoal black";
    if (l < 45) return "charcoal gray";
    if (l < 65) return "neutral gray";
    if (l < 85) return "light gray";
    return "off-white";
  }

  const hue = hueName(h);

  // Special-cased blends that read better to humans than raw hue math
  let base = hue;
  if (hue === "blue" && l < 32 && s > 25) base = "navy blue";
  if (hue === "indigo" && l < 30) base = "deep indigo";
  if (hue === "orange" && s > 55 && l > 45 && l < 65) base = "orange";
  if (hue === "amber" && s > 55) base = "amber";
  if (hue === "red" && l < 28) base = "crimson red";
  if (hue === "green" && s < 35) base = "sage green";
  if (hue === "green" && l < 25) base = "forest green";

  const selfDescriptive = new Set([
    "navy blue",
    "deep indigo",
    "crimson red",
    "forest green",
  ]);

  let lightnessWord = "";
  if (!selfDescriptive.has(base)) {
    if (l < 15) lightnessWord = "near-black";
    else if (l < 28) lightnessWord = "deep";
    else if (l < 42) lightnessWord = "dark";
    else if (l < 62) lightnessWord = "";
    else if (l < 78) lightnessWord = "light";
    else if (l < 90) lightnessWord = "pale";
    else lightnessWord = "near-white";
  }

  // Avoid contradictory pairings like "bright near-black" — "bright"/"light" words
  // describe luminance, so only use them when the color isn't already very dark.
  const isDark = lightnessWord === "near-black" || lightnessWord === "deep" || lightnessWord === "dark";
  let satWord = "";
  if (s > 78) satWord = "vivid";
  else if (s > 50) satWord = isDark ? "" : "bright";
  else if (s > 28) satWord = "";
  else satWord = "muted";

  const words = [satWord, lightnessWord, base].filter(Boolean);
  // Avoid redundant doubles like "deep navy blue deep"
  const seen = new Set<string>();
  const deduped = words.filter((w) => {
    const key = w.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.join(" ");
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
