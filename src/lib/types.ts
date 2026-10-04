export type Hierarchy = "headline" | "subtext" | "badge" | "stamp";

export interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  heightRatio: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  hierarchy: Hierarchy;
}

export interface Swatch {
  hex: string;
  rgb: [number, number, number];
  percent: number;
  name: string;
}

export interface PaletteResult {
  swatches: Swatch[];
  distribution: {
    base: Swatch | null;
    secondary: Swatch | null;
    accent: Swatch | null;
  };
}

export interface AIFontGuess {
  label: string;
  fontGuess: string;
  confidence: "high" | "medium" | "low";
  googleFontAlt: string;
}

export interface AITextTreatment {
  label: string;
  color: string;
  stroke: boolean;
  italicOrSkew: boolean;
  sizeRelation: string;
}

export interface AIAnatomy {
  facePresent: boolean;
  expression: string;
  pointingDirection: string;
  props: string[];
  backgroundType: string;
  effects: string[];
  layoutPattern: string;
}

export interface AIVerdict {
  styleSummary: string;
  tips: string[];
}

/** Extra structured signals used to grade the 15-point commandments checklist. */
export interface AIGrading {
  colorHarmony: "cohesive" | "mixed";
  faceBackgroundContrast: "high" | "medium" | "low" | "n/a";
  textBackgroundContrast: "high" | "medium" | "low";
  emotionStrength: "strong" | "mild" | "none";
  hasNumberOrResultAnchor: boolean;
  propRelevance: "relevant" | "generic" | "none";
  overGlowOnSkin: boolean;
  hierarchyConsistent: boolean;
  clutterLevel: "clean" | "moderate" | "busy";
}

export interface AIAnalysis {
  fonts: AIFontGuess[];
  anatomy: AIAnatomy;
  textTreatment: AITextTreatment[];
  verdict: AIVerdict;
  grading: AIGrading;
  provider: string;
}

export type AIStatus =
  | { ok: true; data: AIAnalysis }
  | { ok: false; reason: "no_key" | "error"; message?: string };

export type PipelineStage =
  | "idle"
  | "colors"
  | "ocr"
  | "ai"
  | "done"
  | "error";

export interface ThumbnailItem {
  id: string;
  file: File;
  fileName: string;
  objectUrl: string;
  width: number;
  height: number;
  stage: PipelineStage;
  error?: string;
  palette?: PaletteResult;
  ocrProgress?: number;
  textBlocks?: TextBlock[];
  ai?: AIStatus;
}

// ---------- Alight Motion color converter ----------
export interface AlightMotionValues {
  huePercent: number;
  saturationPercent: number;
  brightnessPercent: number;
}

// ---------- Phone-size readability simulator ----------
export interface MobileLegibilityBlock {
  id: string;
  text: string;
  hierarchy: Hierarchy;
  scaledPx: number;
  legible: boolean;
}
export interface MobileSimResult {
  scale: number;
  displayWidth: number;
  displayHeight: number;
  blocks: MobileLegibilityBlock[];
  headlinePass: boolean | null; // null = no headline detected to judge
  survivingCount: number;
  totalCount: number;
}

// ---------- Thumbnail Commandments checklist ----------
export type CommandmentStatus = "pass" | "warn" | "fail";
export interface CommandmentResult {
  id: string;
  label: string;
  status: CommandmentStatus;
  why: string;
}
export interface CommandmentsReport {
  rules: CommandmentResult[];
  score: number; // 0-100
}

// ---------- Reference Vault ----------
export interface VaultTags {
  channel: string;
  niche: string;
  style: string;
}
export interface VaultEntry {
  id: string;
  savedAt: number;
  fileName: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  tags: VaultTags;
  palette?: PaletteResult;
  textBlocks?: TextBlock[];
  ai?: AIStatus;
  commandments?: CommandmentsReport;
}

// ---------- Recreation Compare Mode ----------
export interface SimilarityResult {
  paletteMatchPercent: number;
  layoutMatchPercent: number;
  fontMatchNote: string;
  differences: string[];
}

// ---------- Guess-the-font / color quiz ----------
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
}
