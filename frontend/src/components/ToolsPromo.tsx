"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const features = [
  "Bel/boy, bel/kalça, BKİ ve bazal metabolizma tek sayfada",
  "Her sonuç için renkli risk kategorisi ve aralık göstergesi",
  "Bilgileriniz kaydedilir, bir sonraki ziyarette hazır gelir",
];

export default function ToolsPromo() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tp-left",
        { opacity: 0, x: isMobile ? 0 : -50, y: isMobile ? -30 : 0 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        },
      );
      gsap.fromTo(
        ".tp-card",
        { opacity: 0, x: isMobile ? 0 : 60, y: isMobile ? -40 : 0, rotate: 4 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 3,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hesaplamalar-promo"
      className="py-16 lg:py-32 px-6 bg-brand-50 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        {/* Sol: Örnek sonuç kartı mockup */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <div
            className="tp-card opacity-0 w-72 md:w-80 rounded-2xl overflow-hidden shadow-2xl border border-emerald-200 ring-4 ring-emerald-100"
            style={{ transform: "rotate(3deg)" }}
          >
            {/* Kart header */}
            <div className="bg-emerald-500 px-5 py-3.5 flex items-center justify-between">
              <span className="text-white font-semibold text-sm tracking-wide">
                Beden Kitle İndeksi
              </span>
              <span className="bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                Normal
              </span>
            </div>
            {/* Kart içerik */}
            <div className="bg-white px-5 pt-5 pb-5">
              <div className="flex items-end gap-2 mb-3">
                <p className="text-5xl font-bold text-gray-800 leading-none">
                  22.1
                </p>
              </div>
              {/* Range bar */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div className="absolute left-0 top-0 h-full w-[45%] rounded-full bg-emerald-500" />
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm text-gray-600">
                <p>
                  <span className="text-gray-500">İdeal BKİ (yaşa göre):</span>{" "}
                  <span className="font-semibold">22</span>
                </p>
                <p>
                  <span className="text-gray-500">İdeal kilo aralığı:</span>{" "}
                  <span className="font-semibold">68.5 kg</span>
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
                  {[
                    { label: "Zayıf", bg: "bg-amber-100", color: "text-amber-700" },
                    { label: "Normal", bg: "bg-emerald-100", color: "text-emerald-700" },
                    { label: "Şişman", bg: "bg-orange-100", color: "text-orange-700" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`${item.bg} rounded-lg px-1 py-2`}
                    >
                      <p className={`font-bold text-sm ${item.color}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: Metin + Özellikler + CTA */}
        <div className="tp-left opacity-0 flex-1 max-w-lg">
          <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-4">
            Ücretsiz Hesaplamalar
          </p>
          <h2 className="font-oswald text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Sonuçlarınız
            <br />
            <span className="text-brand-500">saniyeler içinde.</span>
          </h2>
          <p className="font-hind-vadodara text-gray-600 text-lg leading-relaxed mb-8">
            Bilgilerinizi bir kez girin; tüm ölçümlerinizi tek sayfada,
            anında görün.
          </p>

          <ul className="space-y-3 mb-10">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">
                  ✓
                </span>
                <span className="font-hind-vadodara text-gray-700 text-sm leading-relaxed">
                  {f}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/hesaplamalar"
            className="inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-full transition-colors duration-200 text-sm"
          >
            Hesaplamaya Başla
            <span className="text-base">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
