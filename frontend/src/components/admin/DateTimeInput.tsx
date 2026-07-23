"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { monthGrid, WEEKDAY_LABELS, formatMonthTitle, todayISO } from "@/lib/calendar";

const BASE_INPUT =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

const pad = (n: number) => String(n).padStart(2, "0");

// Close the popup when clicking outside / pressing Escape.
function useOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}

// ─── Date input ────────────────────────────────────────────────

function isoToTr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function parseDateText(t: string): string | null {
  const s = t.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return validIso(+m[3], +m[2], +m[1]);
  return null;
}

function validIso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function DateInput({
  value,
  onChange,
  placeholder = "GG.AA.YYYY",
  inputClassName = BASE_INPUT,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(isoToTr(value));
  const ref = useOutside(() => setOpen(false));

  const base = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : todayISO();
  const [viewY, setViewY] = useState(Number(base.slice(0, 4)));
  const [viewM, setViewM] = useState(Number(base.slice(5, 7)) - 1);

  // Keep text in sync when value changes externally
  useEffect(() => {
    setText(isoToTr(value));
  }, [value]);

  const openPicker = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setViewY(Number(value.slice(0, 4)));
      setViewM(Number(value.slice(5, 7)) - 1);
    }
    setOpen(true);
  };

  const grid = useMemo(() => monthGrid(viewY, viewM), [viewY, viewM]);

  const prev = () => {
    if (viewM === 0) {
      setViewY(viewY - 1);
      setViewM(11);
    } else setViewM(viewM - 1);
  };
  const next = () => {
    if (viewM === 11) {
      setViewY(viewY + 1);
      setViewM(0);
    } else setViewM(viewM + 1);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        value={text}
        placeholder={placeholder}
        onFocus={openPicker}
        onClick={openPicker}
        onChange={(e) => {
          setText(e.target.value);
          const iso = parseDateText(e.target.value);
          if (iso) onChange(iso);
        }}
        className={inputClassName}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prev}
              className="w-7 h-7 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {formatMonthTitle(viewY, viewM)}
            </span>
            <button
              type="button"
              onClick={next}
              className="w-7 h-7 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-[11px] text-gray-400 text-center font-medium"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((c) => {
              const selected = c.iso === value;
              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => {
                    onChange(c.iso);
                    setText(isoToTr(c.iso));
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs transition-colors ${
                    selected
                      ? "bg-brand-500 text-white font-semibold"
                      : c.isToday
                        ? "text-brand-600 font-semibold hover:bg-brand-50"
                        : c.inMonth
                          ? "text-gray-700 hover:bg-brand-50"
                          : "text-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Select / searchable combobox ──────────────────────────────

export interface Option {
  value: string;
  label: string;
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder = "Seçin",
  searchable = false,
  inputClassName = BASE_INPUT,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useOutside(() => {
    setOpen(false);
    setQuery("");
  });

  const selected = options.find((o) => o.value === value);
  const filtered =
    searchable && query
      ? options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options;

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={ref}>
      {searchable ? (
        <input
          value={open ? query : (selected?.label ?? "")}
          placeholder={selected ? selected.label : placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className={inputClassName}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${inputClassName} text-left flex items-center justify-between`}
        >
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected?.label ?? placeholder}
          </span>
          <span className="text-gray-400 ml-2">▾</span>
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-2 text-sm text-gray-400">Sonuç yok</p>
          ) : (
            filtered.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-brand-500 text-white font-semibold"
                      : "text-gray-700 hover:bg-brand-50"
                  }`}
                >
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Time input (15-minute steps) ──────────────────────────────

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  for (const m of [0, 15, 30, 45]) TIME_SLOTS.push(`${pad(h)}:${pad(m)}`);
}

export function TimeInput({
  value,
  onChange,
  placeholder = "SS:DD",
  inputClassName = BASE_INPUT,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll the selected/near slot into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector("[data-active='true']");
      if (active) active.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        >
          {TIME_SLOTS.map((t) => {
            const active = t === value;
            return (
              <button
                key={t}
                type="button"
                data-active={active}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-brand-500 text-white font-semibold"
                    : "text-gray-700 hover:bg-brand-50"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
