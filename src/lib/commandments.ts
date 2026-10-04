import type {
  AIAnalysis,
  CommandmentResult,
  CommandmentsReport,
  PaletteResult,
  TextBlock,
  MobileSimResult,
} from "./types";

interface CommandmentInput {
  ai?: AIAnalysis;
  palette?: PaletteResult;
  textBlocks?: TextBlock[];
  mobileSim?: MobileSimResult;
}

function rule(
  id: string,
  label: string,
  status: CommandmentResult["status"],
  why: string
): CommandmentResult {
  return { id, label, status, why };
}

const NEEDS_AI = (label: string) =>
  rule(label.toLowerCase().replace(/\s+/g, "-"), label, "warn", "AI analysis needed to grade this rule — add a vision API key.");

/**
 * Runs a 15-point "thumbnail commandments" checklist against the already
 * computed palette / OCR / AI signals for one thumbnail. No extra network
 * calls — this is pure local scoring over data that's already in memory.
 */
export function gradeCommandments(input: CommandmentInput): CommandmentsReport {
  const { ai, palette, textBlocks = [], mobileSim } = input;
  const rules: CommandmentResult[] = [];

  // 1. Strong focal point (face or clearly relevant subject/prop)
  if (ai) {
    const { facePresent } = ai.anatomy;
    const propsOk = ai.grading.propRelevance === "relevant";
    if (facePresent || propsOk) {
      rules.push(
        rule(
          "focal-point",
          "Strong focal point",
          "pass",
          facePresent
            ? "A face is present to anchor viewer attention."
            : "Relevant props give the frame a clear subject."
        )
      );
    } else {
      rules.push(
        rule(
          "focal-point",
          "Strong focal point",
          "warn",
          "No face detected and props read as generic — viewers may not know what the video is about at a glance."
        )
      );
    }
  } else {
    rules.push(NEEDS_AI("Strong focal point"));
  }

  // 2. Facial expression reads instantly
  if (ai) {
    const strength = ai.grading.emotionStrength;
    if (!ai.anatomy.facePresent) {
      rules.push(rule("expression", "Expression reads instantly", "warn", "No face in frame, so there's no expression to rely on — make sure another hook (text/number/prop) carries the click."));
    } else if (strength === "strong") {
      rules.push(rule("expression", "Expression reads instantly", "pass", "Expression is strong and legible even at a glance."));
    } else if (strength === "mild") {
      rules.push(rule("expression", "Expression reads instantly", "warn", "Expression is present but mild — consider exaggerating it slightly for more click power."));
    } else {
      rules.push(rule("expression", "Expression reads instantly", "fail", "Face present but expression doesn't read as an emotion — thumbnails with flat expressions under-perform."));
    }
  } else {
    rules.push(NEEDS_AI("Expression reads instantly"));
  }

  // 3. Subject/face stands out from background
  if (ai) {
    const c = ai.grading.faceBackgroundContrast;
    if (c === "n/a") {
      rules.push(rule("subject-contrast", "Subject pops from background", "warn", "No face to judge — verify your main subject still separates from the background."));
    } else if (c === "high") {
      rules.push(rule("subject-contrast", "Subject pops from background", "pass", "Face/subject contrasts clearly against the background."));
    } else if (c === "medium") {
      rules.push(rule("subject-contrast", "Subject pops from background", "warn", "Contrast is moderate — a rim light or background darken/blur would help the subject pop more."));
    } else {
      rules.push(rule("subject-contrast", "Subject pops from background", "fail", "Subject blends into the background — add contrast (light, outline, or background separation)."));
    }
  } else {
    rules.push(NEEDS_AI("Subject pops from background"));
  }

  // 4. Headline passes the mobile glance test
  if (mobileSim) {
    if (mobileSim.headlinePass === null) {
      rules.push(rule("mobile-glance", "Headline readable at mobile size", "warn", "No headline-level text block detected to test."));
    } else if (mobileSim.headlinePass) {
      rules.push(rule("mobile-glance", "Headline readable at mobile size", "pass", `Headline stays legible scaled down to a ${mobileSim.displayWidth}px mobile feed card.`));
    } else {
      rules.push(rule("mobile-glance", "Headline readable at mobile size", "fail", "Headline text shrinks below a legible size on a phone feed — go bigger or bolder."));
    }
  } else {
    rules.push(rule("mobile-glance", "Headline readable at mobile size", "warn", "Run OCR first to test this rule."));
  }

  // 5. Text contrast against its background
  if (ai) {
    const c = ai.grading.textBackgroundContrast;
    if (c === "high") {
      rules.push(rule("text-contrast", "Text pops from its background", "pass", "Text color contrasts clearly against what's behind it."));
    } else if (c === "medium") {
      rules.push(rule("text-contrast", "Text pops from its background", "warn", "Text contrast is only medium — add a stroke/shadow or shift the text color."));
    } else {
      rules.push(rule("text-contrast", "Text pops from its background", "fail", "Text is hard to read against its background — this will hurt mobile legibility."));
    }
  } else {
    rules.push(NEEDS_AI("Text pops from its background"));
  }

  // 6. Cohesive, limited color palette
  if (palette && palette.swatches.length) {
    const dominant = palette.swatches.filter((s) => s.percent >= 10).length;
    const cohesive = ai ? ai.grading.colorHarmony === "cohesive" : dominant <= 4;
    if (cohesive) {
      rules.push(rule("palette-cohesion", "Cohesive color palette", "pass", `${dominant} dominant color${dominant === 1 ? "" : "s"} forming a readable 60-30-10 split.`));
    } else {
      rules.push(rule("palette-cohesion", "Cohesive color palette", "warn", "Several competing dominant colors — consider pulling the palette toward one family with a strong accent."));
    }
  } else {
    rules.push(rule("palette-cohesion", "Cohesive color palette", "warn", "Palette not extracted yet."));
  }

  // 7. Clear visual hierarchy
  if (ai) {
    if (ai.grading.hierarchyConsistent) {
      rules.push(rule("hierarchy", "Clear visual hierarchy", "pass", "Text sizes rank logically by importance (headline clearly dominant)."));
    } else {
      rules.push(rule("hierarchy", "Clear visual hierarchy", "fail", "Text blocks compete in size — make the headline the unmistakable largest element."));
    }
  } else {
    rules.push(NEEDS_AI("Clear visual hierarchy"));
  }

  // 8. Minimal clutter
  if (ai) {
    const level = ai.grading.clutterLevel;
    if (level === "clean") {
      rules.push(rule("clutter", "Minimal visual clutter", "pass", "Frame stays clean and easy to parse at a glance."));
    } else if (level === "moderate") {
      rules.push(rule("clutter", "Minimal visual clutter", "warn", "Some clutter — see if any element can be removed or simplified."));
    } else {
      rules.push(rule("clutter", "Minimal visual clutter", "fail", "Frame is busy — too many competing elements hurt instant readability."));
    }
  } else {
    rules.push(NEEDS_AI("Minimal visual clutter"));
  }

  // 9. Intentional layout pattern (not a random/other dump)
  if (ai) {
    const layout = ai.anatomy.layoutPattern.toLowerCase();
    const intentional = /centered|thirds|mega-number|plate|split/.test(layout);
    rules.push(
      intentional
        ? rule("layout", "Intentional composition", "pass", `Layout reads as a recognizable pattern: "${ai.anatomy.layoutPattern}".`)
        : rule("layout", "Intentional composition", "warn", `Layout pattern ("${ai.anatomy.layoutPattern}") doesn't clearly match a proven composition template.`)
    );
  } else {
    rules.push(NEEDS_AI("Intentional composition"));
  }

  // 10. Curiosity hook: number / result / stat anchor
  if (ai) {
    if (ai.grading.hasNumberOrResultAnchor) {
      rules.push(rule("hook-anchor", "Has a number/result hook", "pass", "A number, stat, or concrete result is visible — strong curiosity driver."));
    } else {
      rules.push(rule("hook-anchor", "Has a number/result hook", "warn", "No number or concrete result visible — consider adding one (e.g. \"in 5 min\", \"+40%\", \"Part 2\")."));
    }
  } else {
    rules.push(NEEDS_AI("Has a number/result hook"));
  }

  // 11. Props are topic-relevant
  if (ai) {
    const rel = ai.grading.propRelevance;
    if (rel === "relevant") {
      rules.push(rule("props", "Props support the topic", "pass", "Visible props are specific and relevant to the subject."));
    } else if (rel === "generic") {
      rules.push(rule("props", "Props support the topic", "warn", "Props read as generic stock elements — swap for something topic-specific."));
    } else {
      rules.push(rule("props", "Props support the topic", "warn", "No props detected — not required, but a well-chosen prop can boost context."));
    }
  } else {
    rules.push(NEEDS_AI("Props support the topic"));
  }

  // 12. Not too much text (max ~3-4 blocks)
  const count = textBlocks.length;
  if (count === 0) {
    rules.push(rule("text-density", "Text kept concise", "warn", "No text detected — fine for a pure-visual thumbnail, but confirm that's intentional."));
  } else if (count <= 4) {
    rules.push(rule("text-density", "Text kept concise", "pass", `${count} text block${count === 1 ? "" : "s"} — concise enough to read in under a second.`));
  } else {
    rules.push(rule("text-density", "Text kept concise", "fail", `${count} separate text blocks — likely too much to read at a glance, trim it down.`));
  }

  // 13. Effects controlled (no blown-out glow on skin)
  if (ai) {
    if (!ai.grading.overGlowOnSkin) {
      rules.push(rule("effects-control", "Effects are controlled", "pass", "Glow/light effects look controlled, including on skin tones."));
    } else {
      rules.push(rule("effects-control", "Effects are controlled", "fail", "Glow is blown out on skin — dial back intensity or opacity on that layer."));
    }
  } else {
    rules.push(NEEDS_AI("Effects are controlled"));
  }

  // 14. Headline uses a strong display font (not default/system-looking)
  if (ai) {
    const headlineFonts = ai.fonts.filter((f) => /head|main|title/i.test(f.label));
    const sample = headlineFonts[0] ?? ai.fonts[0];
    const weakFont = sample && /arial|default|system|times|calibri/i.test(sample.fontGuess);
    if (!sample) {
      rules.push(rule("font-strength", "Strong display headline font", "warn", "No headline text to judge — skip or add a bold hook word."));
    } else if (!weakFont) {
      rules.push(rule("font-strength", "Strong display headline font", "pass", `Headline uses a bold display face ("${sample.fontGuess}").`));
    } else {
      rules.push(rule("font-strength", "Strong display headline font", "fail", "Headline looks like a default system font — swap to a heavy display face (e.g. Anton, Bebas Neue, Archivo Black)."));
    }
  } else {
    rules.push(NEEDS_AI("Strong display headline font"));
  }

  // 15. Cohesive, specific genre identity
  if (ai) {
    const summary = ai.verdict.styleSummary || "";
    const specific = summary.length > 12 && summary.toLowerCase() !== "style unclear";
    rules.push(
      specific
        ? rule("style-identity", "Clear style identity", "pass", `Reads as a specific, recognizable style: "${summary}".`)
        : rule("style-identity", "Clear style identity", "warn", "Style doesn't read as a specific recognizable genre/format yet.")
    );
  } else {
    rules.push(NEEDS_AI("Clear style identity"));
  }

  const weights = { pass: 1, warn: 0.5, fail: 0 } as const;
  const score = Math.round(
    (rules.reduce((sum, r) => sum + weights[r.status], 0) / rules.length) * 100
  );

  return { rules, score };
}
