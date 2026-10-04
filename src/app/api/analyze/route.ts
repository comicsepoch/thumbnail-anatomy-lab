import { NextRequest, NextResponse } from "next/server";
import { callGemini, callOpenAI, normalize } from "@/lib/visionAnalysis";

export const runtime = "nodejs";

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
        raw = await callOpenAI(dataUrl, openaiKey, process.env.OPENAI_VISION_MODEL);
        provider = `OpenAI (${process.env.OPENAI_VISION_MODEL || "gpt-4o"})`;
      } else if (geminiKey) {
        const result = await callGemini(dataUrl, geminiKey, process.env.GEMINI_VISION_MODEL);
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
