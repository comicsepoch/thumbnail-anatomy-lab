import type { ThumbnailItem } from "@/lib/types";

export default function CompareStrip({ items }: { items: ThumbnailItem[] }) {
  if (items.length < 2) return null;

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Compare
        </h2>
        <span className="text-xs text-navy-500">palettes side by side</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-w-[160px] flex-shrink-0 flex-col gap-2 rounded-xl border border-navy-700 bg-navy-850 p-2.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.objectUrl}
              alt={item.fileName}
              className="h-20 w-full rounded-lg object-cover"
            />
            <p className="truncate text-[11px] text-navy-500" title={item.fileName}>
              {item.fileName}
            </p>
            {item.palette?.swatches.length ? (
              <div className="flex h-5 w-full overflow-hidden rounded-md ring-1 ring-black/30">
                {item.palette.swatches.map((s, i) => (
                  <div
                    key={i}
                    style={{ backgroundColor: s.hex, width: `${s.percent}%` }}
                    title={`${s.hex} · ${s.percent}% · ${s.name}`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-5 w-full animate-pulse rounded-md bg-navy-700" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
