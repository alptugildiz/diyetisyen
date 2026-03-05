"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AKTIVITE_LEVELS = [
  { label: "Hareketsiz (ofis işi, spor yok)", factor: 1.2 },
  { label: "Az Aktif (haftada 1-3 gün hafif spor)", factor: 1.375 },
  { label: "Orta Aktif (haftada 3-5 gün orta spor)", factor: 1.55 },
  { label: "Çok Aktif (haftada 6-7 gün yoğun spor)", factor: 1.725 },
  { label: "Aşırı Aktif (fiziksel iş + günlük yoğun spor)", factor: 1.9 },
];

type Result = {
  bmr: number;
  tdee: number;
  kiloVer: number;
  koru: number;
  kiloAl: number;
};

function calcBMR(cinsiyet: string, kilo: number, boy: number, yas: number) {
  // Mifflin-St Jeor
  if (cinsiyet === "erkek") {
    return 10 * kilo + 6.25 * boy - 5 * yas + 5;
  } else {
    return 10 * kilo + 6.25 * boy - 5 * yas - 161;
  }
}

export default function KaloriHesaplayiciPage() {
  const [form, setForm] = useState({
    boy: "",
    kilo: "",
    yas: "",
    cinsiyet: "kadin",
    aktivite: "0",
  });
  const [result, setResult] = useState<Result | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const hesapla = () => {
    const boy = parseFloat(form.boy);
    const kilo = parseFloat(form.kilo);
    const yas = parseFloat(form.yas);
    if (!boy || !kilo || !yas) return;

    const bmr = calcBMR(form.cinsiyet, kilo, boy, yas);
    const factor = AKTIVITE_LEVELS[parseInt(form.aktivite)].factor;
    const tdee = bmr * factor;
    setResult({
      bmr,
      tdee,
      kiloVer: tdee - 500,
      koru: tdee,
      kiloAl: tdee + 500,
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-brand-bg to-brand-50 pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/araclar"
            className="inline-flex items-center gap-2 text-brand-500 text-sm font-cabin font-semibold mb-8 hover:gap-3 transition-all duration-200"
          >
            ← Araçlara Dön
          </Link>

          <div className="mb-10">
            <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-2">
              Araç
            </p>
            <h1 className="font-oswald text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Kalori <span className="text-brand-500">Hesaplayıcı</span>
            </h1>
            <p className="font-hind-vadodara text-gray-600">
              Mifflin-St Jeor formülüyle bazal metabolizma hızınızı ve günlük
              kalori ihtiyacınızı hesaplayın.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/60 border border-brand-100 rounded-2xl p-8 mb-6">
            <div className="mb-4">
              <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                Cinsiyet
              </label>
              <select
                name="cinsiyet"
                value={form.cinsiyet}
                onChange={handleChange}
                className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
              >
                <option value="kadin">Kadın</option>
                <option value="erkek">Erkek</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Boy (cm)
                </label>
                <input
                  name="boy"
                  type="number"
                  placeholder="170"
                  value={form.boy}
                  onChange={handleChange}
                  className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                />
              </div>
              <div>
                <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Kilo (kg)
                </label>
                <input
                  name="kilo"
                  type="number"
                  placeholder="70"
                  value={form.kilo}
                  onChange={handleChange}
                  className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                />
              </div>
              <div>
                <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Yaş
                </label>
                <input
                  name="yas"
                  type="number"
                  placeholder="28"
                  value={form.yas}
                  onChange={handleChange}
                  className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                Aktivite Düzeyi
              </label>
              <select
                name="aktivite"
                value={form.aktivite}
                onChange={handleChange}
                className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
              >
                {AKTIVITE_LEVELS.map((a, i) => (
                  <option key={i} value={String(i)}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={hesapla}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold font-cabin py-4 rounded-full transition-colors duration-200"
            >
              Hesapla
            </button>
          </div>

          {/* Sonuç */}
          {result && (
            <div className="bg-white/70 border border-brand-200 rounded-2xl p-8 space-y-5">
              <h2 className="font-oswald text-2xl font-bold text-gray-900 mb-2">
                Sonuçlar
              </h2>

              <div className="flex items-center justify-between border-b border-brand-100 pb-4">
                <div>
                  <span className="font-cabin text-sm font-semibold text-gray-600 block">
                    Bazal Metabolizma Hızı
                  </span>
                  <span className="font-hind-vadodara text-xs text-gray-400">
                    Tam dinlenimde yakılan kalori
                  </span>
                </div>
                <span className="font-oswald text-3xl font-bold text-gray-900">
                  {Math.round(result.bmr)}{" "}
                  <span className="text-base font-cabin text-gray-500">
                    kcal
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-brand-100 pb-4">
                <div>
                  <span className="font-cabin text-sm font-semibold text-gray-600 block">
                    Günlük Kalori İhtiyacı (TDEE)
                  </span>
                  <span className="font-hind-vadodara text-xs text-gray-400">
                    Mevcut kilonuzu korumak için
                  </span>
                </div>
                <span className="font-oswald text-3xl font-bold text-brand-500">
                  {Math.round(result.tdee)}{" "}
                  <span className="text-base font-cabin text-gray-500">
                    kcal
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="font-cabin text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Kilo Ver
                  </p>
                  <p className="font-oswald text-xl font-bold text-gray-900">
                    {Math.round(result.kiloVer)}
                  </p>
                  <p className="font-hind-vadodara text-xs text-gray-500">
                    kcal/gün
                  </p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                  <p className="font-cabin text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
                    Koru
                  </p>
                  <p className="font-oswald text-xl font-bold text-gray-900">
                    {Math.round(result.koru)}
                  </p>
                  <p className="font-hind-vadodara text-xs text-gray-500">
                    kcal/gün
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="font-cabin text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                    Kilo Al
                  </p>
                  <p className="font-oswald text-xl font-bold text-gray-900">
                    {Math.round(result.kiloAl)}
                  </p>
                  <p className="font-hind-vadodara text-xs text-gray-500">
                    kcal/gün
                  </p>
                </div>
              </div>

              <p className="font-hind-vadodara text-xs text-gray-400 pt-2">
                * Kilo verme/alma değerleri ±500 kcal/gün farkına dayanmakta
                olup haftada ~0.5 kg değişimi hedefler. Bu hesaplamalar genel
                bilgilendirme amaçlıdır.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
