import type { PipelineStage } from "@/lib/types";

const LABELS: Record<PipelineStage, string> = {
  idle: "Queued",
  colors: "Extracting colors…",
  ocr: "Running OCR…",
  ai: "Asking vision model…",
  done: "Analysis complete",
  error: "Error",
};

export default function StageBadge({ stage, ocrProgress }: { stage: PipelineStage; ocrProgress?: number }) {
  const isWorking = stage !== "idle" && stage !== "done" && stage !== "error";
  const label =
    stage === "ocr" && ocrProgress !== undefined && ocrProgress > 0
      ? `Running OCR… ${Math.round(ocrProgress * 100)}%`
      : LABELS[stage];

  const color =
    stage === "done"
      ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
      : stage === "error"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : "bg-accent/15 text-accent ring-accent/30";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${color}`}
    >
      {isWorking && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}
