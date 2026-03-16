/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";

type Gender = "erkek" | "kadin";
type Activity = "cok_hafif" | "hafif" | "orta" | "agir" | "cok_agir";

interface FormData {
  cinsiyet: Gender;
  yas: string;
  boy: string;
  agirlik: string;
  bel: string;
  kalca: string;
  aktivite: Activity;
}

interface Results {
  belBoy: number;
  belKalca: number;
  bki: number;
  idealBki: number;
  idealKilo: number;
  bmr: number;
  tee: number;
  cinsiyet: Gender;
  aktivite: Activity;
}

const STORAGE_KEY = "hesaplamalar_form";

const DEFAULT_FORM: FormData = {
  cinsiyet: "kadin",
  yas: "",
  boy: "",
  agirlik: "",
  bel: "",
  kalca: "",
  aktivite: "orta",
};

const AKTIVITE_LABELS: Record<Activity, string> = {
  cok_hafif: "Çok Hafif",
  hafif: "Hafif",
  orta: "Orta",
  agir: "Ağır",
  cok_agir: "Çok Ağır",
};

const AKTIVITE_FAKTORU: Record<Activity, { erkek: number; kadin: number }> = {
  cok_hafif: { erkek: 1.3, kadin: 1.3 },
  hafif: { erkek: 1.6, kadin: 1.5 },
  orta: { erkek: 1.7, kadin: 1.6 },
  agir: { erkek: 2.1, kadin: 1.9 },
  cok_agir: { erkek: 2.4, kadin: 2.2 },
};

function getIdealBki(yas: number): number {
  if (yas <= 24) return 21;
  if (yas <= 34) return 22;
  if (yas <= 44) return 23;
  if (yas <= 54) return 24;
  if (yas <= 65) return 25;
  return 26;
}

type ColorKey = "green" | "amber" | "orange" | "red" | "blue";

const COLORS: Record<
  ColorKey,
  { header: string; border: string; bg: string; ring: string }
> = {
  green: {
    header: "bg-emerald-500",
    border: "border-emerald-200",
    bg: "bg-emerald-50/60",
    ring: "ring-emerald-100",
  },
  amber: {
    header: "bg-amber-400",
    border: "border-amber-200",
    bg: "bg-amber-50/60",
    ring: "ring-amber-100",
  },
  orange: {
    header: "bg-orange-500",
    border: "border-orange-200",
    bg: "bg-orange-50/60",
    ring: "ring-orange-100",
  },
  red: {
    header: "bg-red-500",
    border: "border-red-200",
    bg: "bg-red-50/60",
    ring: "ring-red-100",
  },
  blue: {
    header: "bg-brand-500",
    border: "border-brand-200",
    bg: "bg-brand-50/60",
    ring: "ring-brand-100",
  },
};

function belBoyColor(v: number): ColorKey {
  if (v < 0.4) return "amber";
  if (v <= 0.5) return "green";
  if (v <= 0.6) return "orange";
  return "red";
}
function belBoyYorum(v: number) {
  if (v < 0.4) return "Dikkat";
  if (v <= 0.5) return "Uygun";
  if (v <= 0.6) return "Sınırda";
  return "Riskli";
}

function belKalcaColor(v: number, g: Gender): ColorKey {
  return v < (g === "erkek" ? 0.9 : 0.85) ? "green" : "red";
}
function belKalcaYorum(v: number, g: Gender) {
  return v < (g === "erkek" ? 0.9 : 0.85) ? "Normal" : "Riskli";
}

function bkiColor(v: number): ColorKey {
  if (v < 18.5) return "amber";
  if (v < 25) return "green";
  if (v < 30) return "amber";
  if (v < 35) return "orange";
  return "red";
}
function bkiYorum(v: number) {
  if (v < 18.5) return "Zayıf";
  if (v < 25) return "Normal";
  if (v < 30) return "Hafif Şişman";
  if (v < 35) return "Şişman";
  if (v < 45) return "Obez";
  return "Aşırı Obez";
}

function RangeBar({
  value,
  min,
  max,
  color,
}: {
  value: number;
  min: number;
  max: number;
  color: ColorKey;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const barColor: Record<ColorKey, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-400",
    orange: "bg-orange-500",
    red: "bg-red-500",
    blue: "bg-brand-500",
  };
  return (
    <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${barColor[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ResultCard({
  title,
  color,
  label,
  value,
  unit,
  rangeValue,
  rangeMin,
  rangeMax,
  children,
}: {
  title: string;
  color: ColorKey;
  label: string;
  value: string;
  unit?: string;
  rangeValue?: number;
  rangeMin?: number;
  rangeMax?: number;
  children?: React.ReactNode;
}) {
  const c = COLORS[color];
  return (
    <div
      className={`h-full rounded-2xl overflow-hidden border ${c.border} shadow-md ring-4 ${c.ring} flex flex-col`}
    >
      {/* Renkli header */}
      <div
        className={`${c.header} px-5 py-4 flex items-center justify-between shrink-0`}
      >
        <span className="text-white font-bold text-sm tracking-wide">
          {title}
        </span>
        <span className="bg-white/25 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
          {label}
        </span>
      </div>
      {/* İçerik */}
      <div className="bg-white px-5 pt-5 pb-5 flex-1 flex flex-col">
        <div className="flex items-end gap-2 mb-3">
          <p className="text-5xl font-bold text-gray-800 leading-none">
            {value}
          </p>
          {unit && <p className="text-sm text-gray-400 mb-1">{unit}</p>}
        </div>
        {rangeValue !== undefined &&
          rangeMin !== undefined &&
          rangeMax !== undefined && (
            <div className="mb-4">
              <RangeBar
                value={rangeValue}
                min={rangeMin}
                max={rangeMax}
                color={color}
              />
            </div>
          )}
        {children && (
          <div className="border-t border-gray-100 pt-3 mt-auto space-y-1.5 text-sm text-gray-600">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition text-left flex items-center justify-between"
      >
        <span className="font-medium">{selected?.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white rounded-xl border border-brand-100 shadow-xl overflow-hidden">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-sm text-left flex items-center justify-between transition-colors
                ${
                  opt.value === value
                    ? "bg-brand-500 text-white font-semibold"
                    : "text-gray-700 hover:bg-brand-50 hover:text-brand-600"
                }
                ${i < options.length - 1 ? "border-b border-gray-100" : ""}
              `}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HesaplamalarPage() {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [results, setResults] = useState<Results | null>(null);
  const [resultsKey, setResultsKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setForm(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, hydrated]);

  const set = (k: keyof FormData, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  function hesapla() {
    const yas = parseFloat(form.yas);
    const boy = parseFloat(form.boy);
    const agirlik = parseFloat(form.agirlik);
    const bel = parseFloat(form.bel);
    const kalca = parseFloat(form.kalca);
    if ([yas, boy, agirlik, bel, kalca].some(isNaN)) return;

    const boyM = boy / 100;
    const idealBki = getIdealBki(yas);
    const bmr =
      form.cinsiyet === "erkek"
        ? 66.5 + 13.75 * agirlik + 5.0 * boy - 6.77 * yas
        : 655.1 + 9.56 * agirlik + 1.85 * boy - 4.67 * yas;

    setResultsKey((k) => k + 1);
    setResults({
      belBoy: bel / boy,
      belKalca: bel / kalca,
      bki: agirlik / (boyM * boyM),
      idealBki,
      idealKilo: idealBki * boyM * boyM,
      bmr,
      tee: bmr * AKTIVITE_FAKTORU[form.aktivite][form.cinsiyet],
      cinsiyet: form.cinsiyet,
      aktivite: form.aktivite,
    });

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition";

  const aktiviteOptions = (Object.keys(AKTIVITE_LABELS) as Activity[]).map(
    (k) => ({ value: k, label: AKTIVITE_LABELS[k] })
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-linear-to-b from-brand-bg to-brand-50 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-oswald text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Hesaplamalar
            </h1>
            <p className="text-gray-500 text-sm">
              Bilgilerinizi girin, tüm sonuçları tek seferde görün.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            {/* Cinsiyet */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cinsiyet
              </label>
              <div className="flex gap-3">
                {(["kadin", "erkek"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("cinsiyet", g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                      form.cinsiyet === g
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    {g === "kadin" ? "Kadın" : "Erkek"}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 kolonlu inputlar */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { key: "yas", label: "Yaş", unit: "yıl" },
                { key: "boy", label: "Boy", unit: "cm" },
                { key: "agirlik", label: "Ağırlık", unit: "kg" },
                { key: "bel", label: "Bel Çevresi", unit: "cm" },
              ].map(({ key, label, unit }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}{" "}
                    <span className="text-gray-400 font-normal">({unit})</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form[key as keyof FormData]}
                    onChange={(e) => set(key as keyof FormData, e.target.value)}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              ))}

              {/* Kalça çevresi — full width */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kalça Çevresi{" "}
                  <span className="text-gray-400 font-normal">(cm)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.kalca}
                  onChange={(e) => set("kalca", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Aktivite */}
            <div className="mb-7">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aktivite Düzeyi
              </label>
              <SelectDropdown
                value={form.aktivite}
                onChange={(v) => set("aktivite", v)}
                options={aktiviteOptions}
              />
            </div>

            <button
              onClick={hesapla}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors duration-200"
            >
              Hesapla
            </button>
          </div>

          {/* Sonuçlar */}
          {results && (
            <div key={resultsKey} ref={resultsRef} className="scroll-mt-6">
              <style>{`
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(24px); }
                  to   { opacity: 1; transform: translateY(0);    }
                }
                .card-anim { opacity: 0; animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
              `}</style>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
                {/* Bel / Boy */}
                <div className="card-anim flex flex-col" style={{ animationDelay: "0ms" }}>
                  <ResultCard
                    title="Bel / Boy İndeksi"
                    color={belBoyColor(results.belBoy)}
                    label={belBoyYorum(results.belBoy)}
                    value={results.belBoy.toFixed(3)}
                    rangeValue={results.belBoy}
                    rangeMin={0.3}
                    rangeMax={0.7}
                  >
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { range: "<0.40", yorum: "Dikkat", text: "text-amber-700", bg: "bg-amber-50 border border-amber-200" },
                        { range: "0.40–0.50", yorum: "Uygun", text: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200" },
                        { range: "0.50–0.60", yorum: "Sınırda", text: "text-orange-700", bg: "bg-orange-50 border border-orange-200" },
                        { range: ">0.60", yorum: "Riskli", text: "text-red-700", bg: "bg-red-50 border border-red-200" },
                      ].map((item) => (
                        <div key={item.range} className={`${item.bg} rounded-xl px-1 py-2.5`}>
                          <p className={`font-bold text-sm leading-tight ${item.text}`}>{item.yorum}</p>
                          <p className="text-gray-400 text-xs mt-1">{item.range}</p>
                        </div>
                      ))}
                    </div>
                  </ResultCard>
                </div>

                {/* Bel / Kalça */}
                <div className="card-anim flex flex-col" style={{ animationDelay: "100ms" }}>
                  <ResultCard
                    title="Bel / Kalça İndeksi"
                    color={belKalcaColor(results.belKalca, results.cinsiyet)}
                    label={belKalcaYorum(results.belKalca, results.cinsiyet)}
                    value={results.belKalca.toFixed(2)}
                    rangeValue={results.belKalca}
                    rangeMin={0.6}
                    rangeMax={1.1}
                  >
                    <p>
                      <span className="text-gray-500">Risk eşiği:</span>{" "}
                      <span className="font-semibold">
                        {results.cinsiyet === "erkek" ? "≥ 0.90" : "≥ 0.85"}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      {results.belKalca <
                      (results.cinsiyet === "erkek" ? 0.9 : 0.85)
                        ? "Karın bölgesi yağlanması normal sınırlar içinde."
                        : "Karın bölgesi yağlanması risk sınırını aşıyor."}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-center pt-1">
                      {[
                        { range: results.cinsiyet === "erkek" ? "< 0.90" : "< 0.85", yorum: "Normal", text: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200" },
                        { range: results.cinsiyet === "erkek" ? "≥ 0.90" : "≥ 0.85", yorum: "Riskli", text: "text-red-700", bg: "bg-red-50 border border-red-200" },
                      ].map((item) => (
                        <div key={item.range} className={`${item.bg} rounded-xl px-2 py-2.5`}>
                          <p className={`font-bold text-sm leading-tight ${item.text}`}>{item.yorum}</p>
                          <p className="text-gray-400 text-xs mt-1">{item.range}</p>
                        </div>
                      ))}
                    </div>
                  </ResultCard>
                </div>

                {/* BKİ */}
                <div className="card-anim flex flex-col" style={{ animationDelay: "200ms" }}>
                  <ResultCard
                    title="Beden Kitle İndeksi"
                    color={bkiColor(results.bki)}
                    label={bkiYorum(results.bki)}
                    value={results.bki.toFixed(1)}
                    rangeValue={results.bki}
                    rangeMin={15}
                    rangeMax={45}
                  >
                    <p>
                      <span className="text-gray-500">İdeal BKİ (yaşa göre):</span>{" "}
                      <span className="font-semibold">{results.idealBki}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">İdeal kilo aralığı:</span>{" "}
                      <span className="font-semibold">{results.idealKilo.toFixed(1)} kg</span>
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                      {[
                        { range: "<18.5", label: "Zayıf", text: "text-amber-700", bg: "bg-amber-50 border border-amber-200" },
                        { range: "18.5–24.9", label: "Normal", text: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200" },
                        { range: "25–29.9", label: "H. Şişman", text: "text-amber-700", bg: "bg-amber-50 border border-amber-200" },
                        { range: "30–34.9", label: "Şişman", text: "text-orange-700", bg: "bg-orange-50 border border-orange-200" },
                        { range: "35–44.9", label: "Obez", text: "text-red-700", bg: "bg-red-50 border border-red-200" },
                        { range: "≥45", label: "A. Obez", text: "text-red-800", bg: "bg-red-100 border border-red-300" },
                      ].map((item) => (
                        <div key={item.range} className={`${item.bg} rounded-xl px-1 py-2.5`}>
                          <p className={`font-bold text-sm leading-tight ${item.text}`}>{item.label}</p>
                          <p className="text-gray-400 text-xs mt-1">{item.range}</p>
                        </div>
                      ))}
                    </div>
                  </ResultCard>
                </div>

                {/* BMR */}
                <div className="card-anim flex flex-col" style={{ animationDelay: "300ms" }}>
                  <ResultCard
                    title="Bazal Metabolizma (BMR)"
                    color="blue"
                    label="Bilgi"
                    value={Math.round(results.bmr).toLocaleString("tr-TR")}
                    unit="kkal/gün"
                  >
                    <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 mb-1">
                      <p className="text-xs text-brand-600 font-medium mb-0.5">Toplam Enerji (TEE)</p>
                      <p className="text-xl font-bold text-brand-700">
                        {Math.round(results.tee).toLocaleString("tr-TR")}{" "}
                        <span className="text-sm font-normal text-brand-500">kkal/gün</span>
                      </p>
                    </div>
                    <p>
                      <span className="text-gray-500">Aktivite düzeyi:</span>{" "}
                      <span className="font-semibold">{AKTIVITE_LABELS[results.aktivite]}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Çarpan:</span>{" "}
                      <span className="font-semibold">
                        × {AKTIVITE_FAKTORU[results.aktivite][results.cinsiyet]}
                      </span>
                    </p>
                  </ResultCard>
                </div>
              </div>

              {/* Randevu Al */}
              <div className="card-anim mt-5" style={{ animationDelay: "400ms" }}>
                <div className="rounded-2xl bg-white border border-brand-100 px-6 py-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Bu hesaplamalar yalnızca bilgilendirme amaçlıdır.
                  </p>
                  <p className="text-xs text-gray-500 mb-5">
                    Kesin tanı ve kişiye özel beslenme programı için bir
                    diyetisyene danışmanız önerilir.
                  </p>
                  <a
                    href="/#iletisim"
                    className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-7 py-3 rounded-full transition-colors duration-200"
                  >
                    Randevu Al
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
