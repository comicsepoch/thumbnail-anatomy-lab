import { callGemini, normalize } from "./visionAnalysis";
import type { AIStatus } from "./types";

// On a Node host (e.g. Vercel) the app calls the secure server route
// `/api/analyze`, which keeps the API key out of the browser entirely. On a
// static host with no server (e.g. GitHub Pages) there is no route to call,
// so as an explicit, opt-in fallback this module calls Gemini directly from
// the browser using a build-time `NEXT_PUBLIC_GEMINI_API_KEY`.
//
// IMPORTANT: anything prefixed `NEXT_PUBLIC_` is baked into the shipped
// JavaScript bundle and is visible to anyone who opens dev tools or views
// page source. Only set this for a public-key-style demo deployment where
// you have restricted the key (HTTP referrer restriction in Google AI
// Studio / Cloud Console) and accept the exposure — never reuse a key that
// guards a paid/production project.
const CLIENT_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const CLIENT_GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_VISION_MODEL;

export function clientHasKey(): boolean {
  return Boolean(CLIENT_GEMINI_KEY);
}

export async function runClientAnalysis(dataUrl: string): Promise<AIStatus> {
  if (!CLIENT_GEMINI_KEY) {
    return { ok: false, reason: "no_key" };
  }
  try {
    const result = await callGemini(dataUrl, CLIENT_GEMINI_KEY, CLIENT_GEMINI_MODEL);
    const data = normalize(result.data, `Gemini (${result.model}, client-side)`);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Unknown AI error",
    };
  }
}
