"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const INSTAGRAM_URL = "https://www.instagram.com/trakyadiyetisyen/";

const cards = [
  {
    id: 1,
    image: "/instagram/trakya-diyetisyen-1.jpg",
    caption: "Sağlıklı öğün hazırlama ipuçları",
    likes: 124,
  },
  {
    id: 2,
    image: "/instagram/trakya-diyetisyen-2.jpg",
    caption: "Mevsim meyveleriyle beslenme",
    likes: 89,
  },
  {
    id: 3,
    image: "/instagram/trakya-diyetisyen-3.jpg",
    caption: "Sağlıklı yağ kaynakları",
    likes: 156,
  },
  {
    id: 4,
    image: "/instagram/trakya-diyetisyen-4.jpg",
    caption: "Porsiyon kontrolü rehberi",
    likes: 203,
  },
  {
    id: 5,
    image: "/instagram/trakya-diyetisyen-5.jpg",
    caption: "Günlük su tüketimi önerileri",
    likes: 97,
  },
];

const CENTER = Math.floor(cards.length / 2);

function getFanTransform(index: number, total: number, mobile: boolean) {
  const offset = index - Math.floor(total / 2);
  const rotation = offset * (mobile ? 6 : 8);
  const translateX = offset * (mobile ? 55 : 110);
  const zIndex = total - Math.abs(offset);
  return { rotation, translateX, zIndex };
}

export default function InstagramCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(CENTER);
  const entranceDone = useRef(false);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currentFront = useRef<number | null>(null);

  // Lift hovered card up
  const liftCard = useCallback((index: number) => {
    if (currentFront.current === index) return;
    // Drop previous card first
    if (currentFront.current !== null) {
      const prev = cardRefs.current[currentFront.current];
      if (prev) {
        gsap.killTweensOf(prev);
        gsap.to(prev, { y: 0, scale: 1, duration: 0.3, ease: "power3.out" });
      }
    }
    currentFront.current = index;
    const el = cardRefs.current[index];
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      y: -40,
      scale: 1.06,
      duration: 0.4,
      ease: "back.out(1.7)",
    });
  }, []);

  // Lower current card back
  const dropCard = useCallback(() => {
    if (currentFront.current === null) return;
    const el = cardRefs.current[currentFront.current];
    currentFront.current = null;
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      y: 0,
      scale: 1,
      duration: 0.35,
      ease: "power3.out",
    });
  }, []);

  // ScrollTrigger entrance animation
  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Title
      gsap.fromTo(
        ".ig-title",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        },
      );

      // Cards: start stacked, fan out
      gsap.fromTo(
        ".ig-card",
        { opacity: 0, scale: 0.8, rotation: 0, x: 0, y: 50 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          rotation: (i: number) => (i - CENTER) * (isMobile ? 6 : 8),
          x: (i: number) => (i - CENTER) * (isMobile ? 50 : 90),
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.4)",
          scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
          onComplete: () => {
            entranceDone.current = true;
          },
        },
      );

      // CTA button
      gsap.fromTo(
        ".ig-cta",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 55%" },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  // Mobile auto-cycle
  useEffect(() => {
    if (!isMobile || !entranceDone.current) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isMobile]);

  // React to activeIndex change (mobile auto-cycle)
  useEffect(() => {
    if (!isMobile || !entranceDone.current) return;
    liftCard(activeIndex);
  }, [activeIndex, isMobile, liftCard]);

  const handleCardMouseEnter = (index: number) => {
    if (isMobile || !entranceDone.current) return;
    liftCard(index);
  };

  const handleCardMouseLeave = () => {
    if (isMobile || !entranceDone.current) return;
    dropCard();
  };

  return (
    <section
      ref={sectionRef}
      id="instagram"
      className="py-24 px-6 bg-brand-bg overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="ig-title opacity-0 text-center mb-16">
          <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-4">
            Bizi Takip Edin
          </p>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Instagram&apos;da
            <br />
            <span className="text-brand-500">Paylaşımlarımız</span>
          </h2>
        </div>

        {/* Kartlar */}
        <div
          className="relative flex items-center justify-center"
          style={{ height: isMobile ? 340 : 420 }}
        >
          {cards.map((card, index) => {
            const { zIndex } = getFanTransform(index, cards.length, isMobile);
            return (
              <div
                key={card.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="ig-card absolute cursor-pointer select-none"
                style={{
                  width: isMobile ? 200 : 260,
                  height: isMobile ? 280 : 360,
                  zIndex,
                }}
                onMouseEnter={() => handleCardMouseEnter(index)}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => window.open(INSTAGRAM_URL, "_blank")}
              >
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 shrink-0" />
                    <span className="font-semibold text-xs text-gray-800 truncate">
                      trakyadiyetisyen
                    </span>
                  </div>

                  {/* Image area */}
                  <div className="relative flex-1 overflow-hidden">
                    <Image
                      src={card.image}
                      alt={card.caption}
                      fill
                      className="object-cover"
                      sizes="260px"
                    />
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-2 flex gap-3 text-gray-700">
                    <button
                      className="group/heart"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <svg
                        className="w-5 h-5 transition-all duration-300 group-hover/heart:scale-125 group-hover/heart:fill-red-500 group-hover/heart:stroke-red-500 group-hover/heart:drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>

                  {/* Likes + Caption */}
                  <div className="px-3 pb-3">
                    <p className="text-xs font-semibold text-gray-800">
                      {card.likes} beğenme
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      <span className="font-semibold text-gray-800">trakyadiyetisyen</span>{" "}
                      {card.caption}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="ig-cta opacity-0 text-center mt-12">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 text-sm"
          >
            Instagram&apos;da Takip Et
            <span className="text-base">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
