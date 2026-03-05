"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const tools = [
  {
    icon: "📏",
    title: "Antropometrik Ölçümler",
    desc: "Boy, kilo, bel-kalça oranı ve vücut kitle indeksi hesaplamalarını kolayca yapın.",
    slug: "antropometrik-olcumler",
  },
  {
    icon: "⚖️",
    title: "Vücut Analizi",
    desc: "Yağ kütlesi, kas kütlesi ve su oranınızı analiz edin, hedeflerinizi belirleyin.",
    slug: "vucut-analizi",
  },
  {
    icon: "🔥",
    title: "Kalori Hesaplayıcı",
    desc: "Günlük kalori ihtiyacınızı aktivite düzeyinize göre hesaplayın.",
    slug: "kalori-hesaplayici",
  },
];

export default function ToolsPromo() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tools-heading",
        { opacity: 0, y: -40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        },
      );
      gsap.fromTo(
        ".tools-card",
        { opacity: 0, y: -60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="araclar"
      className="pt-24 pb-24 md:pb-40 px-6 bg-linear-to-b from-brand-bg to-brand-50"
    >
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="tools-heading opacity-0 mb-16">
          <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-3">
            Diyetisyen Araçları
          </p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Sağlıklı yaşamın <span className="text-brand-500">araçları</span>
            </h2>
            <p className="font-hind-vadodara text-gray-500 text-base max-w-xs md:text-right leading-relaxed">
              Beslenme yolculuğunuzu destekleyecek hesaplama ve analiz araçları
              geliştiriyoruz.
            </p>
          </div>
        </div>

        {/* Kartlar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t) => (
            <Link
              key={t.slug}
              href={`/araclar/${t.slug}`}
              className="tools-card opacity-0 group relative bg-white/50 border border-brand-400 rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-2 hover:shadow-md transition-all duration-300"
            >
              <div className="text-4xl">{t.icon}</div>
              <div className="flex-1">
                <h3 className="font-oswald text-lg font-semibold text-gray-900 mb-1.5 group-hover:text-brand-500 transition-colors duration-300">
                  {t.title}
                </h3>
                <p className="font-hind-vadodara text-sm text-gray-500 leading-relaxed">
                  {t.desc}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold font-cabin text-brand-500 group-hover:gap-3 transition-all duration-300">
                Hesapla →
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/araclar"
            className="inline-flex items-center gap-3 border-2 border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 text-sm"
          >
            Tüm Araçları Gör
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
