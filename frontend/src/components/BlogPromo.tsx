"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const topics = [
  {
    num: "01",
    label: "Beslenme Makaleleri",
    sub: "Uzman gözüyle bilimsel rehberler",
    gradient: "linear-gradient(to bottom right, #3d8c39, #1b3c19)",
    emoji: "🥗",
    href: "/blog?tag=beslenme",
  },
  {
    num: "02",
    label: "Sık Sorulan Sorular",
    sub: "Aklınızdaki sorulara yanıt",
    gradient: "linear-gradient(to bottom right, #a5d4a3, #3d8c39)",
    emoji: "❓",
    href: "/sss",
  },
  {
    num: "03",
    label: "Tarif & Öneriler",
    sub: "Sağlıklı ve lezzetli tarifler",
    gradient: "linear-gradient(to bottom right, #cbe6ca, #a5d4a3)",
    emoji: "🍽️",
    href: "/blog?tag=diyet",
  },
];

export default function BlogPromo() {
  const sectionRef = useRef<HTMLElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const [activeGradient, setActiveGradient] = useState(topics[0].gradient);
  const [activeEmoji, setActiveEmoji] = useState(topics[0].emoji);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bp-left",
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        },
      );
      gsap.fromTo(
        ".bp-item",
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect || !floatRef.current) return;
    gsap.to(floatRef.current, {
      x: e.clientX - rect.left + 20,
      y: e.clientY - rect.top - 80,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const handleEnter = (topic: (typeof topics)[0]) => {
    setActiveGradient(topic.gradient);
    setActiveEmoji(topic.emoji);
    gsap.to(floatRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.4)",
    });
  };

  const handleLeave = () => {
    gsap.to(floatRef.current, {
      opacity: 0,
      scale: 0.85,
      duration: 0.2,
      ease: "power2.in",
    });
  };

  return (
    <section
      ref={sectionRef}
      id="blog-promo"
      className="py-24 px-6 relative bg-linear-to-b from-brand-50 to-brand-bg overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Fare takipçi görsel - sadece desktop */}
      <div
        ref={floatRef}
        className="hidden md:flex pointer-events-none absolute z-20 w-44 h-44 rounded-2xl items-center justify-center text-7xl shadow-xl opacity-0 flex-col gap-1"
        style={{ top: 0, left: 0, background: activeGradient }}
      >
        {activeEmoji}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        {/* Sol: Tipografi */}
        <div className="bp-left opacity-0 flex-1">
          <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-4">
            Bilgi Köşesi
          </p>
          <h2 className="font-oswald text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Merak ettikleriniz
            <br />
            <span className="text-brand-500">blogda.</span>
          </h2>
          <p className="font-hind-vadodara text-gray-600 text-lg leading-relaxed mb-8 max-w-sm">
            Beslenme hakkında doğru bilgiye ulaşın. Makaleler, sorular ve
            tarifler sizi bekliyor.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-full transition-colors duration-200 text-sm"
          >
            Bloga Git
            <span className="text-base">→</span>
          </Link>
        </div>

        {/* Sağ: Numaralı liste */}
        <div className="flex-1 w-full divide-y divide-brand-200">
          {topics.map((t) => (
            <Link
              key={t.num}
              href={t.href}
              className="bp-item opacity-0 group relative flex items-center gap-6 py-6 cursor-default md:cursor-none topic"
              onMouseEnter={() => handleEnter(t)}
              onMouseLeave={handleLeave}
            >
              <span className="font-oswald text-4xl font-bold text-brand-200 group-hover:text-brand-400 transition-colors duration-300 w-14 shrink-0">
                {t.num}
              </span>
              <div>
                <p className="font-oswald text-xl font-semibold text-gray-900 group-hover:text-brand-500 transition-colors duration-300">
                  {t.label}
                </p>
                <p className="font-hind-vadodara text-sm text-gray-500 mt-0.5">
                  {t.sub}
                </p>
              </div>
              <span className="ml-auto text-brand-500 text-xl font-bold animate-pulse">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
