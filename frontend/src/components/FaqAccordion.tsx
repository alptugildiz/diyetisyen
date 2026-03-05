"use client";

import { useState, useRef } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";
import type { Faq } from "@/types";

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-item",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" },
      );
    }, listRef);
    return () => ctx.revert();
  }, []);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div ref={listRef} className="space-y-3">
      {faqs.map((faq) => {
        const isOpen = openId === faq._id;
        return (
          <div
            key={faq._id}
            className={`faq-item opacity-0 rounded-2xl overflow-hidden border transition-colors duration-200 ${
              isOpen
                ? "border-brand-400"
                : "border-brand-200 bg-brand-200 hover:border-brand-400"
            }`}
          >
            <button
              onClick={() => toggle(faq._id)}
              className={`w-full flex justify-between items-center px-6 py-5 text-left gap-4 transition-colors duration-200 ${
                isOpen ? "bg-brand-500" : "bg-brand-200"
              }`}
            >
              <span
                className={`font-oswald text-lg font-semibold leading-snug transition-colors duration-200 ${
                  isOpen ? "text-white" : "text-brand-600"
                }`}
              >
                {faq.question}
              </span>
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                  isOpen
                    ? "bg-white text-brand-500 rotate-45"
                    : "bg-brand-500 text-white rotate-0"
                }`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-6 pb-6 bg-brand-bg">
                <div className="w-10 h-0.5 bg-brand-400 mb-4 rounded-full mt-4" />
                <p className="font-hind-vadodara text-brand-600/80 leading-relaxed text-base">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
