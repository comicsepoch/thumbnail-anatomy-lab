import type { AIAnalysis, AIFontGuess, AITextTreatment, AIGrading } from "./types";

// Shared, isomorphic (works in both the browser and a Node server route)
// vision-analysis logic: the prompt, the Gemini call + model fallback chain,
// and response normalization. Used by src/app/api/analyze/route.ts when
// running on a Node host, and by src/lib/clientAnalyze.ts when running as a
// fully static export (e.g. GitHub Pages) with no server available.

export const SCHEMA_PROMPT = `You are a senior YouTube thumbnail designer and typography expert. Look at the attached thumbnail image carefully and respond with STRICT JSON ONLY (no markdown fences, no commentary) matching exactly this TypeScript shape:

{
  "fonts": [
    { "label": "short description of which text block, e.g. 'Main headline'", "fontGuess": "closest known font name, pick from or close to: Anton, Montserrat, Bebas Neue, Impact, Oswald, Archivo Black, Gotham, Poppins, or name another real font if clearly different", "confidence": "high" | "medium" | "low", "googleFontAlt": "a free Google Fonts name that is the closest visual substitute" }
  ],
  "anatomy": {
    "facePresent": boolean,
    "expression": "describe the facial expression, or 'none' if no face",
    "pointingDirection": "describe pointing/gesture direction, or 'none'",
    "props": ["short prop name", "..."],
    "backgroundType": "cinematic gradient | photo | plain color | studio backdrop | collage | other, with brief detail",
    "effects": ["choose any that apply: glow", "rim light", "vignette", "stroke outline", "drop shadow", "blur", "lens flare", "none"],
    "layoutPattern": "centered symmetric | rule-of-thirds | mega-number | plate-style | split-screen | other, with brief detail"
  },
  "textTreatment": [
    { "label": "matches a text block seen in the image", "color": "human color description or hex-ish guess", "stroke": boolean, "italicOrSkew": boolean, "sizeRelation": "e.g. 'largest, dominates frame' or 'secondary, 40% of headline size'" }
  ],
  "verdict": {
    "styleSummary": "one punchy line naming the style family/genre this thumbnail belongs to, e.g. 'Indian ed-tech cinematic style, PW-like'",
    "tips": ["tip 1 for recreating this look in a mobile design app", "tip 2", "tip 3"]
  },
  "grading": {
    "colorHarmony": "cohesive" | "mixed",
    "faceBackgroundContrast": "high" | "medium" | "low" | "n/a",
    "textBackgroundContrast": "high" | "medium" | "low",
    "emotionStrength": "strong" | "mild" | "none",
    "hasNumberOrResultAnchor": boolean,
    "propRelevance": "relevant" | "generic" | "none",
    "overGlowOnSkin": boolean,
    "hierarchyConsistent": boolean,
    "clutterLevel": "clean" | "moderate" | "busy"
  }
}

The "grading" block feeds a 15-point pro thumbnail checklist, so grade honestly and strictly like a professional thumbnail design reviewer:
- colorHarmony: "cohesive" if the palette reads as one color family / clear 60-30-10, "mixed" if colors fight each other.
- faceBackgroundContrast: how well a present face pops against its background ("n/a" if no face).
- textBackgroundContrast: how legible the text is against what's behind it.
- emotionStrength: how strongly the subject's expression reads at a glance ("none" if no face/expression).
- hasNumberOrResultAnchor: true if there's a number, stat, "%", "Part N", ranking, or concrete result visible anywhere.
- propRelevance: are visible props actually relevant to the topic, or generic/none.
- overGlowOnSkin: true only if glow/light effects are visibly blown out on skin tones.
- hierarchyConsistent: true if text sizes clearly rank by importance (headline obviously biggest, etc).
- clutterLevel: overall visual busyness of the frame.

Look closely and zoom mentally into every text region, the subject's face, and the background texture before answering — accuracy matters more than speed. Be specific and visual, naming actual colors, props and effects you can see rather than generic placeholders. If there is no text at all, return empty arrays for fonts/textTreatment. Only output the JSON object.`;

// Ordered by accuracy/recency. If the primary model is rate-limited or
// momentarily unavailable we silently fall back to the next one so one bad
// request doesn't take down the whole analysis.
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

export function extractJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response");
  const jsonStr = text.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

async function callGeminiModel(
  model: string,
  mimeType: string,
  base64: string,
  apiKey: string
) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SCHEMA_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 3200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const json = await res.json();
  const content = json.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!content) throw new Error("Gemini response missing content");
  return content;
}

export async function callGemini(
  dataUrl: string,
  apiKey: string,
  preferredModel?: string
): Promise<{ data: unknown; model: string }> {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL for Gemini");
  const [, mimeType, base64] = match;

  const candidates = [
    ...(preferredModel ? [preferredModel] : []),
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastErr: unknown;
  for (const model of candidates) {
    try {
      const content = await callGeminiModel(model, mimeType, base64, apiKey);
      return { data: extractJson(content), model };
    } catch (err) {
      lastErr = err;
      const status = (err as Error & { status?: number }).status;
      // Only fall through to the next model on rate-limit / transient errors.
      if (status === 429 || status === 503 || status === 500) continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All Gemini model attempts failed");
}

export async function callOpenAI(dataUrl: string, apiKey: string, model = "gpt-4o") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SCHEMA_PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      temperature: 0.4,
      max_tokens: 1800,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response missing content");
  return extractJson(content);
}

export function normalize(raw: unknown, provider: string): AIAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const fonts = (Array.isArray(r.fonts) ? r.fonts : []) as AIFontGuess[];
  const textTreatment = (Array.isArray(r.textTreatment) ? r.textTreatment : []) as AITextTreatment[];
  const anatomy = (r.anatomy as Record<string, unknown>) || {};
  const verdict = (r.verdict as Record<string, unknown>) || {};
  const grading = (r.grading as Record<string, unknown>) || {};

  return {
    fonts,
    anatomy: {
      facePresent: Boolean(anatomy.facePresent),
      expression: String(anatomy.expression ?? "unknown"),
      pointingDirection: String(anatomy.pointingDirection ?? "none"),
      props: (Array.isArray(anatomy.props) ? anatomy.props : []) as string[],
      backgroundType: String(anatomy.backgroundType ?? "unknown"),
      effects: (Array.isArray(anatomy.effects) ? anatomy.effects : []) as string[],
      layoutPattern: String(anatomy.layoutPattern ?? "unknown"),
    },
    textTreatment,
    verdict: {
      styleSummary: String(verdict.styleSummary ?? "Style unclear"),
      tips: (Array.isArray(verdict.tips) ? verdict.tips : []) as string[],
    },
    grading: {
      colorHarmony: grading.colorHarmony === "cohesive" ? "cohesive" : "mixed",
      faceBackgroundContrast: ["high", "medium", "low", "n/a"].includes(String(grading.faceBackgroundContrast))
        ? (grading.faceBackgroundContrast as AIGrading["faceBackgroundContrast"])
        : "n/a",
      textBackgroundContrast: ["high", "medium", "low"].includes(String(grading.textBackgroundContrast))
        ? (grading.textBackgroundContrast as "high" | "medium" | "low")
        : "medium",
      emotionStrength: ["strong", "mild", "none"].includes(String(grading.emotionStrength))
        ? (grading.emotionStrength as "strong" | "mild" | "none")
        : "none",
      hasNumberOrResultAnchor: Boolean(grading.hasNumberOrResultAnchor),
      propRelevance: ["relevant", "generic", "none"].includes(String(grading.propRelevance))
        ? (grading.propRelevance as "relevant" | "generic" | "none")
        : "none",
      overGlowOnSkin: Boolean(grading.overGlowOnSkin),
      hierarchyConsistent: grading.hierarchyConsistent !== false,
      clutterLevel: ["clean", "moderate", "busy"].includes(String(grading.clutterLevel))
        ? (grading.clutterLevel as "clean" | "moderate" | "busy")
        : "moderate",
    },
    provider,
  };
}
