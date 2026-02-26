"use client";

import { useRef } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-eyebrow",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-title",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-subtitle",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.45, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-cta",
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          delay: 0.65,
          ease: "back.out(1.4)",
        },
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6"
    >
      <div className="max-w-3xl text-center">
        <p className="hero-eyebrow opacity-0 text-emerald-600 font-semibold tracking-widest uppercase text-sm mb-4">
          Uzman Diyetisyen Danışmanlığı
        </p>
        <h1 className="hero-title opacity-0 text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
          Sağlıklı Beslenme,
          <br />
          <span className="text-emerald-500">Mutlu Yaşam</span>
        </h1>
        <p className="hero-subtitle opacity-0 text-xl text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
          Kişiye özel beslenme programları ve birebir danışmanlık ile
          hedeflerinize ulaşın.
        </p>
        <div className="hero-cta opacity-0 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#iletisim"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-full transition-colors duration-200"
          >
            Randevu Al
          </a>
          <a
            href="/blog"
            className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-4 rounded-full transition-colors duration-200"
          >
            Blog`u Keşfet
          </a>
        </div>
      </div>
    </section>
  );
}
