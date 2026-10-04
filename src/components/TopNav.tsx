"use client";

export type TabKey = "analyze" | "vault" | "compare";

const TABS: { key: TabKey; label: string }[] = [
  { key: "analyze", label: "Analyze" },
  { key: "vault", label: "My Vault" },
  { key: "compare", label: "Recreation Compare" },
];

export default function TopNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="flex gap-1 rounded-xl border border-navy-700 bg-navy-900/70 p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
            active === t.key
              ? "bg-accent text-navy-950 shadow-[0_0_16px_-4px_rgba(255,214,10,0.6)]"
              : "text-navy-400 hover:bg-navy-800 hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
