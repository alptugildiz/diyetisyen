"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Result = {
  yaYuzdesi: number;
  yagKutlesi: number;
  yagsizkutle: number;
  kategori: string;
  kategoriColor: string;
};

function category(
  pct: number,
  cinsiyet: string,
): { label: string; color: string } {
  if (cinsiyet === "erkek") {
    if (pct < 6) return { label: "Temel Yağ", color: "text-blue-400" };
    if (pct < 14) return { label: "Atletik", color: "text-brand-500" };
    if (pct < 18) return { label: "Fit", color: "text-green-500" };
    if (pct < 25)
      return { label: "Kabul Edilebilir", color: "text-yellow-500" };
    return { label: "Obez", color: "text-red-500" };
  } else {
    if (pct < 14) return { label: "Temel Yağ", color: "text-blue-400" };
    if (pct < 21) return { label: "Atletik", color: "text-brand-500" };
    if (pct < 25) return { label: "Fit", color: "text-green-500" };
    if (pct < 32)
      return { label: "Kabul Edilebilir", color: "text-yellow-500" };
    return { label: "Obez", color: "text-red-500" };
  }
}

// US Navy formula
function calcBodyFat(
  cinsiyet: string,
  boy: number,
  bel: number,
  boyun: number,
  kalca: number,
) {
  if (cinsiyet === "erkek") {
    return (
      495 /
        (1.0324 -
          0.19077 * Math.log10(bel - boyun) +
          0.15456 * Math.log10(boy)) -
      450
    );
  } else {
    return (
      495 /
        (1.29579 -
          0.35004 * Math.log10(bel + kalca - boyun) +
          0.221 * Math.log10(boy)) -
      450
    );
  }
}

export default function VucutAnaliziPage() {
  const [form, setForm] = useState({
    boy: "",
    kilo: "",
    bel: "",
    boyun: "",
    kalca: "",
    cinsiyet: "kadin",
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
    const bel = parseFloat(form.bel);
    const boyun = parseFloat(form.boyun);
    const kalca = parseFloat(form.kalca);
    if (!boy || !kilo || !bel || !boyun) return;
    if (form.cinsiyet === "kadin" && !kalca) return;

    const pct = calcBodyFat(form.cinsiyet, boy, bel, boyun, kalca);
    const yagKutlesi = (pct / 100) * kilo;
    const yagsizkutle = kilo - yagKutlesi;
    const { label: kategori, color: kategoriColor } = category(
      pct,
      form.cinsiyet,
    );
    setResult({
      yaYuzdesi: pct,
      yagKutlesi,
      yagsizkutle,
      kategori,
      kategoriColor,
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
              Vücut <span className="text-brand-500">Analizi</span>
            </h1>
            <p className="font-hind-vadodara text-gray-600">
              ABD Deniz Kuvvetleri formülüyle vücut yağ yüzdenizi hesaplayın.
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
            <div className="grid grid-cols-2 gap-4 mb-4">
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
                  Bel Çevresi (cm)
                </label>
                <input
                  name="bel"
                  type="number"
                  placeholder="80"
                  value={form.bel}
                  onChange={handleChange}
                  className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                />
              </div>
              <div>
                <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Boyun Çevresi (cm)
                </label>
                <input
                  name="boyun"
                  type="number"
                  placeholder="36"
                  value={form.boyun}
                  onChange={handleChange}
                  className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                />
              </div>
              {form.cinsiyet === "kadin" && (
                <div className="col-span-2">
                  <label className="font-cabin text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 block">
                    Kalça Çevresi (cm)
                  </label>
                  <input
                    name="kalca"
                    type="number"
                    placeholder="95"
                    value={form.kalca}
                    onChange={handleChange}
                    className="w-full border border-brand-200 rounded-xl px-4 py-3 font-hind-vadodara text-gray-900 focus:outline-none focus:border-brand-500 bg-white/80"
                  />
                </div>
              )}
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
                <span className="font-cabin text-sm font-semibold text-gray-600">
                  Vücut Yağ Yüzdesi
                </span>
                <div className="text-right">
                  <span className="font-oswald text-3xl font-bold text-gray-900">
                    % {result.yaYuzdesi.toFixed(1)}
                  </span>
                  <span
                    className={`ml-2 font-cabin text-sm font-semibold ${result.kategoriColor}`}
                  >
                    {result.kategori}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-brand-100 pb-4">
                <span className="font-cabin text-sm font-semibold text-gray-600">
                  Yağ Kütlesi
                </span>
                <span className="font-oswald text-2xl font-bold text-gray-900">
                  {result.yagKutlesi.toFixed(1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-cabin text-sm font-semibold text-gray-600">
                  Yağsız Kütle (LBM)
                </span>
                <span className="font-oswald text-2xl font-bold text-gray-900">
                  {result.yagsizkutle.toFixed(1)} kg
                </span>
              </div>
              <p className="font-hind-vadodara text-xs text-gray-400 pt-2">
                * Bu hesaplamalar genel bilgilendirme amaçlıdır. Kesin tanı ve
                değerlendirme için bir diyetisyene danışın.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
