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

export interface AIAnalysis {
  fonts: AIFontGuess[];
  anatomy: AIAnatomy;
  textTreatment: AITextTreatment[];
  verdict: AIVerdict;
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
