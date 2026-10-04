import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SCHEMA_PROMPT = `You are a senior YouTube thumbnail designer and typography expert. Look at the attached thumbnail image carefully and respond with STRICT JSON ONLY (no markdown fences, no commentary) matching exactly this TypeScript shape:

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
  }
}

Look closely and zoom mentally into every text region, the subject's face, and the background texture before answering — accuracy matters more than speed. Be specific and visual, naming actual colors, props and effects you can see rather than generic placeholders. If there is no text at all, return empty arrays for fonts/textTreatment. Only output the JSON object.`;

function extractJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response");
  const jsonStr = text.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

async function callOpenAI(dataUrl: string, apiKey: string) {
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";
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
      max_tokens: 1400,
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

// Ordered by accuracy/recency. The primary model comes from env (defaults to
// the newest available Flash model); if it's rate-limited or momentarily
// unavailable we silently fall back to the next one so one bad request
// doesn't take down the whole analysis.
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

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
          maxOutputTokens: 2500,
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
  const content = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!content) throw new Error("Gemini response missing content");
  return content;
}

async function callGemini(dataUrl: string, apiKey: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL for Gemini");
  const [, mimeType, base64] = match;

  const preferred = process.env.GEMINI_VISION_MODEL;
  const candidates = [
    ...(preferred ? [preferred] : []),
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== preferred),
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

function normalize(raw: unknown, provider: string) {
  const r = raw as Record<string, unknown>;
  const fonts = Array.isArray(r.fonts) ? r.fonts : [];
  const textTreatment = Array.isArray(r.textTreatment) ? r.textTreatment : [];
  const anatomy = (r.anatomy as Record<string, unknown>) || {};
  const verdict = (r.verdict as Record<string, unknown>) || {};

  return {
    fonts,
    anatomy: {
      facePresent: Boolean(anatomy.facePresent),
      expression: String(anatomy.expression ?? "unknown"),
      pointingDirection: String(anatomy.pointingDirection ?? "none"),
      props: Array.isArray(anatomy.props) ? anatomy.props : [],
      backgroundType: String(anatomy.backgroundType ?? "unknown"),
      effects: Array.isArray(anatomy.effects) ? anatomy.effects : [],
      layoutPattern: String(anatomy.layoutPattern ?? "unknown"),
    },
    textTreatment,
    verdict: {
      styleSummary: String(verdict.styleSummary ?? "Style unclear"),
      tips: Array.isArray(verdict.tips) ? verdict.tips : [],
    },
    provider,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataUrl: string | undefined = body?.dataUrl;
    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ ok: false, reason: "error", message: "Missing image data" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!openaiKey && !geminiKey) {
      return NextResponse.json({ ok: false, reason: "no_key" }, { status: 200 });
    }

    let raw: unknown;
    let provider = "";
    try {
      if (openaiKey) {
        raw = await callOpenAI(dataUrl, openaiKey);
        provider = `OpenAI (${process.env.OPENAI_VISION_MODEL || "gpt-4o"})`;
      } else if (geminiKey) {
        const result = await callGemini(dataUrl, geminiKey);
        raw = result.data;
        provider = `Gemini (${result.model})`;
      }
    } catch (err) {
      return NextResponse.json(
        { ok: false, reason: "error", message: err instanceof Error ? err.message : "Unknown AI error" },
        { status: 200 }
      );
    }

    const data = normalize(raw, provider);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "error", message: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 200 }
    );
  }
}
