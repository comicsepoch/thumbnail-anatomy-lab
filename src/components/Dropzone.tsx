"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILES = 5;
const MAX_SIZE_MB = 15;

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  currentCount: number;
}

export default function Dropzone({ onFiles, disabled, currentCount }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(fileList);
      const room = MAX_FILES - currentCount;
      if (room <= 0) {
        setError(`You already have ${MAX_FILES} thumbnails. Remove one to add more.`);
        return;
      }

      const valid: File[] = [];
      const rejected: string[] = [];
      for (const f of incoming) {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          rejected.push(`${f.name} (unsupported type)`);
          continue;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          rejected.push(`${f.name} (over ${MAX_SIZE_MB}MB)`);
          continue;
        }
        valid.push(f);
      }

      const toAdd = valid.slice(0, room);
      if (valid.length > room) {
        rejected.push(`${valid.length - room} file(s) skipped — max ${MAX_FILES} thumbnails at once`);
      }
      if (rejected.length) {
        setError(`Skipped: ${rejected.join(", ")}`);
      }
      if (toAdd.length) onFiles(toAdd);
    },
    [currentCount, onFiles]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          if (e.dataTransfer.files?.length) validateAndEmit(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all
          ${isDragging ? "border-accent bg-accent/10 scale-[1.01]" : "border-navy-600 bg-navy-900/60 hover:border-accent/70 hover:bg-navy-850"}
          ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) validateAndEmit(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30 transition-transform group-hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="font-display text-lg font-medium tracking-wide text-white">
            Drag &amp; drop thumbnails here
          </p>
          <p className="mt-1 text-sm text-navy-500">
            or click to browse — JPG, PNG, WEBP · up to {MAX_FILES} at once · {currentCount}/{MAX_FILES} added
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/30">
          {error}
        </p>
      )}
    </div>
  );
}
