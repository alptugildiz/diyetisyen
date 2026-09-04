"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Result = {
  bmi: number;
  category: string;
  categoryColor: string;
  idealMin: number;
  idealMax: number;
  belKalcaOrani: number;
  belKalcaRisk: string;
  belKalcaRiskColor: string;
};

function calcBMI(kilo: number, boyM: number) {
  return kilo / (boyM * boyM);
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Zayıf", color: "text-blue-500" };
  if (bmi < 25) return { label: "Normal", color: "text-brand-500" };
  if (bmi < 30) return { label: "Fazla Kilolu", color: "text-yellow-500" };
  return { label: "Obez", color: "text-red-500" };
}

function belKalcaRisk(oran: number, cinsiyet: string) {
  if (cinsiyet === "erkek") {
    if (oran < 0.9) return { label: "Düşük Risk", color: "text-brand-500" };
    if (oran < 1.0) return { label: "Orta Risk", color: "text-yellow-500" };
    return { label: "Yüksek Risk", color: "text-red-500" };
  } else {
    if (oran < 0.8) return { label: "Düşük Risk", color: "text-brand-500" };
    if (oran < 0.85) return { label: "Orta Risk", color: "text-yellow-500" };
    return { label: "Yüksek Risk", color: "text-red-500" };
  }
}

export default function AntropometrikPage() {
  const [form, setForm] = useState({
    boy: "",
    kilo: "",
    bel: "",
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
    const kalca = parseFloat(form.kalca);
    if (!boy || !kilo || !bel || !kalca) return;

    const boyM = boy / 100;
    const bmi = calcBMI(kilo, boyM);
    const { label: category, color: categoryColor } = bmiCategory(bmi);
    const idealMin = 18.5 * boyM * boyM;
    const idealMax = 24.9 * boyM * boyM;
    const belKalca = bel / kalca;
    const { label: belKalcaRiskLabel, color: belKalcaRiskColor } = belKalcaRisk(
      belKalca,
      form.cinsiyet,
    );

    setResult({
      bmi,
      category,
      categoryColor,
      idealMin,
      idealMax,
      belKalcaOrani: belKalca,
      belKalcaRisk: belKalcaRiskLabel,
      belKalcaRiskColor,
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
              Antropometrik <span className="text-brand-500">Ölçümler</span>
            </h1>
            <p className="font-hind-vadodara text-gray-600">
              Vücut kitle indeksi (BKİ) ve bel-kalça oranı hesaplaması yapın.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/60 border border-brand-100 rounded-2xl p-8 mb-6">
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
            </div>
            <div className="mb-6">
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
                  Vücut Kitle İndeksi (BKİ)
                </span>
                <div className="text-right">
                  <span className="font-oswald text-3xl font-bold text-gray-900">
                    {result.bmi.toFixed(1)}
                  </span>
                  <span
                    className={`ml-2 font-cabin text-sm font-semibold ${result.categoryColor}`}
                  >
                    {result.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-brand-100 pb-4">
                <span className="font-cabin text-sm font-semibold text-gray-600">
                  İdeal Kilo Aralığı
                </span>
                <span className="font-oswald text-xl font-bold text-gray-900">
                  {result.idealMin.toFixed(1)} – {result.idealMax.toFixed(1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-cabin text-sm font-semibold text-gray-600">
                  Bel-Kalça Oranı
                </span>
                <div className="text-right">
                  <span className="font-oswald text-2xl font-bold text-gray-900">
                    {result.belKalcaOrani.toFixed(2)}
                  </span>
                  <span
                    className={`ml-2 font-cabin text-sm font-semibold ${result.belKalcaRiskColor}`}
                  >
                    {result.belKalcaRisk}
                  </span>
                </div>
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
