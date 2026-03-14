"use client";

import { useState } from "react";
import type { Faq } from "@/types";

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-3">
      {faqs.map((faq) => {
        const isOpen = openId === faq._id;
        return (
          <div
            key={faq._id}
            className={`rounded-2xl overflow-hidden border transition-colors duration-200 ${
              isOpen
                ? "border-brand-400"
                : "border-brand-200 bg-brand-50 hover:border-brand-400"
            }`}
          >
            <button
              onClick={() => toggle(faq._id)}
              className={`w-full flex justify-between items-center px-6 py-5 text-left gap-4 transition-colors duration-200 ${
                isOpen ? "bg-brand-500" : "bg-brand-50"
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
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-96" : "max-h-0"
              }`}
            >
              <div className="px-6 pb-6 bg-brand-bg">
                <div className="w-10 h-0.5 bg-brand-400 mb-4 rounded-full mt-4" />
                <p className="font-hind-vadodara text-brand-600/80 leading-relaxed text-base">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
