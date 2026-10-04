export default function KeyWarning() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3.5 text-amber-200">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-5 w-5 shrink-0">
        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-amber-100">No AI vision API key detected</p>
        <p className="mt-0.5 text-amber-200/90">
          Font identification, visual anatomy and the design verdict need a vision model. Set{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[12px]">OPENAI_API_KEY</code> (uses GPT-4o) or{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[12px]">GEMINI_API_KEY</code> in your environment and
          restart the app. Extracted text and the color palette still work fully offline below.
        </p>
      </div>
    </div>
  );
}
