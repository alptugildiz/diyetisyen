"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

export default function About() {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [".about-img", ".about-text"],
        { opacity: 0, x: (i) => (i === 0 ? -50 : 50) },
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%" },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} id="hakkimda" className="py-24 px-6 bg-emerald-50">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="about-img opacity-0 bg-emerald-200 rounded-3xl h-80 flex items-center justify-center text-6xl">
          👩‍⚕️
        </div>
        <div className="about-text opacity-0">
          <p className="text-emerald-600 font-semibold uppercase tracking-widest text-sm mb-3">
            Hakkımda
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
            Bilimsel temelli,
            <br /> kişiye özel yaklaşım
          </h2>
          <p className="text-gray-600 mb-4 leading-relaxed">
            10 yılı aşkın deneyimim ile sağlıklı beslenmenin yalnızca kilo
            kontrolünden ibaret olmadığına inanıyorum. Enerji, ruh hali ve uzun
            vadeli sağlık hedeflerinize ulaşmak için yanınızdayım.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Hacettepe Üniversitesi Beslenme ve Diyetetik mezunuyum. Sporcu
            beslenmesi ve klinik diyetetik alanlarında uzmanlaşmış, 500&apos;den
            fazla danışana hizmet vermiş bir diyetisyenim.
          </p>
        </div>
      </div>
    </section>
  );
}
