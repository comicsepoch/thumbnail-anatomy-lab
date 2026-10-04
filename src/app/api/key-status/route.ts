import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({
    hasKey: hasOpenAI || hasGemini,
    provider: hasOpenAI ? "openai" : hasGemini ? "gemini" : null,
  });
}
