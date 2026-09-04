"use client";

export type CalendarView = "ay" | "hafta";

const OPTIONS: { key: CalendarView; label: string }[] = [
  { key: "hafta", label: "Hafta" },
  { key: "ay", label: "Ay" },
];

export default function ViewToggle({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Takvim görünümü"
      className="inline-flex rounded-xl border border-gray-300 p-0.5 bg-white"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === o.key
              ? "bg-brand-500 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
