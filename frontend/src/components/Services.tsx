"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

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
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
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
    <section ref={sectionRef} id="hizmetler" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Hizmetlerim</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Her bireyin ihtiyacı farklıdır. Size özel çözümler sunuyorum.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((s) => (
            <div
              key={s.title}
              className="service-card opacity-0 bg-emerald-50 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-4xl mb-4">{s.emoji}</div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                {s.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
