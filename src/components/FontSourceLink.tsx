"use client";

import { resolveFontLinks } from "@/lib/fontLinks";

export default function FontSourceLink({ fontGuess, googleFontAlt }: { fontGuess: string; googleFontAlt: string }) {
  const info = resolveFontLinks(fontGuess, googleFontAlt);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {info.isDirectlyFree && info.directUrl ? (
        <a
          href={info.directUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
        >
          ↗ Get &ldquo;{fontGuess}&rdquo; free on Google Fonts
        </a>
      ) : (
        <span className="text-navy-500">Not free — try the alternative:</span>
      )}
      {!info.isDirectlyFree && (
        <a
          href={info.alternativeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          ↗ {info.alternativeName} (Google Fonts)
        </a>
      )}
    </div>
  );
}
