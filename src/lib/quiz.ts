import type { AIAnalysis, PaletteResult, QuizQuestion } from "./types";

const FONT_DISTRACTOR_POOL = [
  "Anton",
  "Montserrat",
  "Bebas Neue",
  "Impact",
  "Oswald",
  "Archivo Black",
  "Gotham",
  "Poppins",
  "Bangers",
  "Lobster",
  "Raleway",
  "Inter",
  "Playfair Display",
  "Righteous",
  "Alfa Slab One",
];

const COLOR_DISTRACTOR_POOL = [
  "crimson red",
  "deep navy blue",
  "sunflower yellow",
  "electric purple",
  "forest green",
  "charcoal black",
  "burnt orange",
  "hot pink",
  "sky blue",
  "warm beige",
  "slate gray",
  "lime green",
];

function makeId(prefix: string, i: number) {
  return `${prefix}-${i}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(pool: string[], correct: string, count: number): string[] {
  const filtered = pool.filter((p) => p.toLowerCase() !== correct.toLowerCase());
  return shuffle(filtered).slice(0, count);
}

/** Builds a "guess the font" + "guess the color" multiple-choice quiz from
 * already-computed AI font guesses and the extracted palette — no new
 * analysis calls, just reshuffled existing data. */
export function buildQuiz(ai: AIAnalysis | undefined, palette: PaletteResult | undefined): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  ai?.fonts.forEach((f, i) => {
    const distractors = pickDistractors(FONT_DISTRACTOR_POOL, f.fontGuess, 3);
    const options = shuffle([f.fontGuess, ...distractors]);
    questions.push({
      id: makeId("font", i),
      prompt: `What font does the "${f.label}" text use?`,
      options,
      correctAnswer: f.fontGuess,
    });
  });

  const top = palette?.swatches.slice(0, 3) ?? [];
  top.forEach((s, i) => {
    const distractors = pickDistractors(COLOR_DISTRACTOR_POOL, s.name, 3);
    const options = shuffle([s.name, ...distractors]);
    questions.push({
      id: makeId("color", i),
      prompt: `What's the closest name for swatch #${i + 1} (${s.hex})?`,
      options,
      correctAnswer: s.name,
    });
  });

  return questions;
}
