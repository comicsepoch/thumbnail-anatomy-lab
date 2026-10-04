// Curated set of font names that are actually hosted on Google Fonts (free,
// direct-download/embed). If the AI's `fontGuess` matches one of these we
// link straight to it; otherwise we fall back to its `googleFontAlt`.
const GOOGLE_FONTS = new Set(
  [
    "Anton",
    "Montserrat",
    "Bebas Neue",
    "Oswald",
    "Poppins",
    "Archivo Black",
    "Inter",
    "Roboto",
    "Roboto Condensed",
    "Open Sans",
    "Lato",
    "Raleway",
    "Nunito",
    "Playfair Display",
    "Merriweather",
    "Rubik",
    "Work Sans",
    "Barlow",
    "Barlow Condensed",
    "Teko",
    "Bangers",
    "Passion One",
    "Fjalla One",
    "Alfa Slab One",
    "Righteous",
    "Lobster",
    "Bungee",
    "Staatliches",
    "Russo One",
    "Exo 2",
    "Saira Condensed",
    "Khand",
    "Anton SC",
    "Black Ops One",
    "Kanit",
  ].map((f) => f.toLowerCase())
);

// A few well-known commercial/system fonts that often get guessed, mapped to
// the closest well-regarded free alternative (used only if the AI didn't
// already supply a googleFontAlt for some reason).
const KNOWN_FREE_ALTERNATIVES: Record<string, string> = {
  gotham: "Montserrat",
  "proxima nova": "Montserrat",
  "helvetica neue": "Inter",
  helvetica: "Inter",
  futura: "Poppins",
  din: "Oswald",
  "brandon grotesque": "Poppins",
  circular: "Rubik",
  "sf pro": "Inter",
  impact: "Anton",
  "trade gothic": "Oswald",
  avenir: "Poppins",
};

export function googleFontsUrl(fontName: string): string {
  return `https://fonts.google.com/specimen/${encodeURIComponent(fontName.trim().replace(/\s+/g, "+"))}`;
}

export interface FontLinkInfo {
  isDirectlyFree: boolean;
  directUrl: string | null;
  alternativeName: string;
  alternativeUrl: string;
}

/**
 * Given the AI's font guess + its suggested Google-Fonts alternative,
 * work out which links to actually show: a direct Google Fonts link if the
 * guessed font is itself free/hosted there, plus always a free-alternative
 * link as a fallback.
 */
export function resolveFontLinks(fontGuess: string, googleFontAlt: string): FontLinkInfo {
  const key = fontGuess.trim().toLowerCase();
  const isDirectlyFree = GOOGLE_FONTS.has(key);
  const alternativeName = googleFontAlt?.trim() || KNOWN_FREE_ALTERNATIVES[key] || "Montserrat";

  return {
    isDirectlyFree,
    directUrl: isDirectlyFree ? googleFontsUrl(fontGuess) : null,
    alternativeName,
    alternativeUrl: googleFontsUrl(alternativeName),
  };
}
