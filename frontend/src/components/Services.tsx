/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SERVICES } from "@/content/hizmetler";

// Hizmet listesi tek kaynaktan: içerik dosyaları. Kart metniyle hizmet
// sayfasındaki metnin ayrışması bu sayede mümkün değil.
const services = SERVICES.map((s) => ({
  emoji: s.emoji,
  title: s.title,
  desc: s.cardDescription,
  href: `/hizmetler/${s.slug}`,
}));

export default function Services() {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const visibleCount = isMobile ? 1 : 3;
  const cardWidth = isMobile ? 80 : 100 / 3;
  const maxIdx = services.length - visibleCount;

  useEffect(() => {
    if (current > maxIdx) setCurrent(maxIdx);
  }, [maxIdx, current]);

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => (c >= maxIdx ? 0 : c + 1));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c >= maxIdx ? 0 : c + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [maxIdx]);

  return (
    <section
      id="hizmetler"
      className="py-24 px-6 bg-linear-to-b from-brand-bg to-brand-50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-brand-600 font-cabin font-semibold uppercase tracking-widest text-sm mb-3">
            Birlikte Sağlıklı Bir Yolculuğa
          </p>
          <h2 className="font-oswald text-4xl font-bold text-brand-600 mb-4">
            Hizmetlerim
          </h2>
          <p className="text-brand-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Kişiye özel beslenme yaklaşımlarıyla bedeninizi tanımanızı,
            ihtiyaçlarınıza uygun seçimler yapmanızı ve bu süreci sürdürülebilir
            bir yaşam biçimine dönüştürmenizi hedefliyorum.
          </p>
        </div>

        <div className="relative">
          {/* Prev button — desktop only */}
          <button
            onClick={prev}
            disabled={current === 0}
            aria-label="Önceki"
            className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand-50 border border-brand-400 text-brand-600 items-center justify-center shadow transition-all duration-200 hover:bg-brand-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹
          </button>

          {/* Track */}
          <div
            className="overflow-hidden py-8 -my-8"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (diff > 40) next();
              else if (diff < -40) prev();
            }}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${current * cardWidth}%)` }}
            >
              {services.map((s) => (
                <div
                  key={s.title}
                  className="shrink-0 px-3"
                  style={{ width: `${cardWidth}%` }}
                >
                  <Link
                    href={s.href}
                    className="font-oswald block bg-brand-50 border border-brand-400 rounded-2xl p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 h-full"
                  >
                    <div className="text-4xl mb-4">{s.emoji}</div>
                    <h3 className="font-bold text-brand-600 text-lg mb-2">
                      {s.title}
                    </h3>
                    <p className="font-hind-vadodara text-brand-600 text-sm leading-relaxed">
                      {s.desc}
                    </p>
                    <span className="font-hind-vadodara mt-4 inline-block text-sm font-semibold text-brand-500">
                      Ayrıntılar →
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Next button — desktop only */}
          <button
            onClick={next}
            aria-label="Sonraki"
            className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand-50 border border-brand-400 text-brand-600 items-center justify-center shadow transition-all duration-200 hover:bg-brand-500 hover:text-white"
          >
            ›
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: maxIdx + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slayt ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-brand-500" : "w-2 bg-brand-200"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
