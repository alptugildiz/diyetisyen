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
      {faqs.map((faq) => (
        <div
          key={faq._id}
          className="faq-item opacity-0 border border-gray-200 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => toggle(faq._id)}
            className="w-full flex justify-between items-center px-6 py-5 text-left bg-white hover:bg-emerald-50 transition-colors"
          >
            <span className="font-semibold text-gray-900">{faq.question}</span>
            <span
              className={`text-emerald-500 text-xl font-bold transition-transform duration-200 ${
                openId === faq._id ? "rotate-45" : ""
              }`}
            >
              +
            </span>
          </button>
          {openId === faq._id && (
            <div className="px-6 pb-5 text-gray-600 leading-relaxed text-sm bg-white">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
