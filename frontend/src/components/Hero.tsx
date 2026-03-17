/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useRef } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";
import SaladAnimation from "@/components/advanced/SaladAnimation";

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // --- Text animations ---
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
      className="grain relative overflow-hidden min-h-screen flex items-center justify-center bg-linear-to-b from-brand-bg to-brand-50 px-6"
    >
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-center gap-12">
        {/* Sol: Metin */}
        <div className="flex-1 text-center lg:text-left">
          <p className="font-cabin hero-eyebrow opacity-0 text-brand-600 font-semibold tracking-widest uppercase text-sm mb-4">
            Uzman Diyetisyen Danışmanlığı
          </p>
          <h1 className="font-oswald hero-title opacity-0 text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
            Sağlıklı Beslenme,
            <br />
            <span className="font-oswald text-brand-500">Mutlu Yaşam</span>
          </h1>
          <p className="font-hind-vadodara hero-subtitle opacity-0 text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
            Kişiye özel beslenme programları ve birebir danışmanlık ile
            hedeflerinize ulaşın.
          </p>
          <div className="hero-cta opacity-0 flex flex-row flex-wrap gap-3 justify-center lg:justify-start relative top">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-appointment-modal"))}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 text-sm rounded-full transition-colors duration-200"
            >
              Randevu Al
            </button>
            <a
              href="/blog"
              className="border-2 border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold px-6 py-3 text-sm rounded-full transition-colors duration-200"
            >
              Blog&apos;u Keşfet
            </a>
          </div>
        </div>

        {/* Sağ: Salata SVG */}
        <div className="flex-1 flex items-center justify-center -mt-10 lg:mt-0">
          <SaladAnimation />
        </div>
      </div>
    </section>
  );
}
