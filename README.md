# Thumbnail Anatomy Lab

A YouTube thumbnail analysis tool for learning designers. Upload 1–5 thumbnails and get a full breakdown of each one:

1. **Extracted Text** — OCR via `tesseract.js` (runs fully client-side), with a hierarchy guess per line (headline / subtext / badge / stamp).
2. **Color Palette** — top 6 dominant colors extracted via client-side canvas pixel sampling, with hex codes, human-friendly descriptions ("deep navy blue", "vivid amber yellow"), and a 60-30-10 base/secondary/accent guide.
3. **Font Identification** — best-guess font names (matched against common YouTube fonts like Anton, Montserrat, Bebas Neue, Impact, Oswald, Archivo Black, Gotham, Poppins), each with a confidence note and a free Google Fonts alternative.
4. **Visual Anatomy** — face/expression, pointing direction, props, background type, detected effects (glow, rim light, vignette, stroke, drop shadow, blur), and layout pattern.
5. **Text Treatment** — per text block: estimated color, stroke/outline, italic/skew, and size relationship.
6. **Design Verdict** — a one-line style-family summary plus 3 tips for recreating the look.

If 2+ thumbnails are uploaded, a **Compare** strip shows all palettes side by side. Every result card has a **Copy analysis** button that copies a plain-text report to your clipboard.

## Tech stack

- **Next.js 16** (App Router) + **Tailwind CSS v4** — dark navy / yellow designer aesthetic, fully responsive.
- **Color extraction**: pure client-side `<canvas>` pixel sampling — no backend call needed.
- **OCR**: `tesseract.js`, run entirely in the browser (two merged recognition passes tuned for large stylized thumbnail fonts).
- **Fonts / Visual Anatomy / Verdict**: a server route (`/api/analyze`) calls a vision LLM — **OpenAI `gpt-4o`** or **Google Gemini** (defaults to the newest available Flash model) — using an API key read from environment variables. If no key is configured, the UI shows a visible warning banner and still shows OCR + color results.

## Getting started

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set OPENAI_API_KEY or GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | If set, the app uses OpenAI (`gpt-4o` by default, override with `OPENAI_VISION_MODEL`). |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | Used if no OpenAI key is set. Defaults to the newest Flash model, override with `GEMINI_VISION_MODEL`. The route automatically falls back across a few recent Gemini Flash models if the primary one is rate-limited. |

Neither key is ever sent to the browser — the vision call happens server-side in `src/app/api/analyze/route.ts`.

## Project structure

```
src/
  app/
    api/analyze/route.ts      # server-side vision LLM call (OpenAI/Gemini)
    api/key-status/route.ts   # tells the client whether a key is configured
    page.tsx                  # upload + pipeline orchestration
  components/                 # Dropzone, AnalysisCard, CompareStrip, etc.
  lib/
    colorExtract.ts           # canvas-based palette extraction
    colorNames.ts             # RGB -> human color name
    ocr.ts                    # tesseract.js pipeline
    report.ts                 # "Copy analysis" plain-text report builder
```

Built for learning thumbnail design and typography — not for copying creators' work verbatim.
