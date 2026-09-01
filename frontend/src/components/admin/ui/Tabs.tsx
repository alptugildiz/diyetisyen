"use client";

export default function Tabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: T; label: string; badge?: number }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === item.key
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          {item.label}
          {item.badge ? (
            <span className="ml-2 text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
