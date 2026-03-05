"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    emoji: "🥗",
    title: "Kişisel Beslenme Programı",
    desc: "Yaşam tarzınıza ve hedeflerinize özel, bilimsel temelli diyet planları.",
  },
  {
    emoji: "📊",
    title: "Vücut Kompozisyon Analizi",
    desc: "Detaylı ölçümlerle mevcut durumunuzu analiz ederek yol haritanızı çiziyoruz.",
  },
  {
    emoji: "🌿",
    title: "Online Danışmanlık",
    desc: "Nerede olursanız olun, video görüşme ile birebir diyetisyen desteği alın.",
  },
  {
    emoji: "👶",
    title: "Çocuk & Aile Beslenmesi",
    desc: "Sağlıklı büyüme ve aile dengesi için çocuklara özel beslenme rehberliği.",
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".service-card",
        { opacity: 0, y: -80 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.15,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hizmetler"
      className="py-24 px-6 bg-linear-to-b from-brand-bg to-brand-50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-oswald text-4xl font-bold text-brand-600 mb-4">
            Hizmetlerim
          </h2>
          <p className=" text-brand-600 text-lg max-w-xl mx-auto">
            Her bireyin ihtiyacı farklıdır. Size özel çözümler sunuyorum.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((s) => (
            <div
              key={s.title}
              className="font-oswald service-card opacity-0 bg-brand-50 border border-brand-400 rounded-2xl p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
            >
              <div className="text-4xl mb-4">{s.emoji}</div>
              <h3 className="font-bold text-brand-600 text-lg mb-2">
                {s.title}
              </h3>
              <p className="font-hind-vadodara text-brand-600 text-sm leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
