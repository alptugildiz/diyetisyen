"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

export default function About() {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const isMobile = window.innerWidth < 640;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [".about-img", ".about-text"],
        {
          opacity: 0,
          x: isMobile ? 0 : (i) => (i === 0 ? -50 : 50),
          y: isMobile ? -40 : 0,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
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
    <section
      ref={ref}
      id="hakkimda"
      className="py-12 md:py-24 px-6 bg-linear-to-b from-brand-50 to-brand-bg"
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="about-img opacity-0 bg-linear-to-br from-brand-500 to-brand-50 rounded-3xl h-52 md:h-80 lg:h-150 overflow-hidden relative w-full max-w-85 md:max-w-none mx-auto">
          <Image
            src="/diyetisyen.png"
            alt="Diyetisyen Beyza Şule Kahraman"
            fill
            className="object-contain object-center"
          />
        </div>
        <div className="about-text opacity-0 w-full max-w-85 md:max-w-none mx-auto">
          <p className="text-brand-600 font-cabin font-semibold uppercase tracking-widest text-sm mb-3">
            Hakkımda
          </p>
          <h2 className="font-oswald text-3xl md:text-4xl font-bold text-brand-600 mb-6 leading-tight md:whitespace-nowrap">
            Diyetisyen Beyza Şule Kahraman
          </h2>
          <p className="font-hind-vadodara text-gray-600 mb-4 leading-relaxed">
            Kırklareli Üniversitesi Beslenme ve Diyetetik Bölümü mezunuyum.
            Lüleburgaz / Kırklareli&apos;de bulunan Özel Sağlık Meslek Hizmet
            Birimi bünyesinde danışanlarıma profesyonel beslenme danışmanlığı
            hizmeti sunuyorum.
          </p>
          <p className="font-hind-vadodara text-gray-600 mb-4 leading-relaxed">
            Çalışma alanlarım arasında kilo yönetimi, hastalıklarda beslenme
            tedavisi ve sürdürülebilir beslenme yaklaşımları yer almaktadır. Her
            bireyin yaşam tarzı, sağlık durumu ve beslenme alışkanlıklarının
            farklı olduğu bilinciyle; danışanlarıma kişiye özel beslenme
            programları hazırlıyorum.
          </p>
          <p className="font-hind-vadodara text-gray-600 mb-4 leading-relaxed">
            Beslenmeyi kısa süreli diyetler yerine uzun vadede sürdürülebilir ve
            uygulanabilir bir yaşam biçimi olarak ele alıyorum. Bilimsel ve
            güncel beslenme yaklaşımlarını günlük hayata uyarlamayı
            hedefliyorum.
          </p>
          <p className="font-hind-vadodara text-gray-600 leading-relaxed">
            Sağlıklı kilo vermek, kilosunu korumak veya mevcut sağlık durumuna
            uygun bir beslenme düzeni oluşturmak isteyen herkese; güvenilir ve
            sürdürülebilir çözümler sunmak en büyük amacım.
          </p>
        </div>
      </div>
    </section>
  );
}
