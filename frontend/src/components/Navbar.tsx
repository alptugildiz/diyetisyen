"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const links = [
  { href: "/#hakkimda", label: "Hakkımda" },
  { href: "/araclar", label: "Araçlar" },
  { href: "/blog", label: "Blog" },
  { href: "/sss", label: "SSS" },
  { href: "/#iletisim", label: "İletişim" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  } | null>(null);

  const linkRefs = useRef<(HTMLLIElement | null)[]>([]);
  const randevuRef = useRef<HTMLLIElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const getPillPos = (el: HTMLElement | null) => {
    if (!el || !listRef.current) return null;
    const listRect = listRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return { left: rect.left - listRect.left, width: rect.width };
  };

  // pill'i mount'ta Randevu Al'ın üzerine konumlandır
  useEffect(() => {
    const pos = getPillPos(randevuRef.current);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  }, []);

  const handleLinkEnter = (i: number) => {
    setHoveredIdx(i);
    const pos = getPillPos(linkRefs.current[i]);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  };

  const handleRandevuEnter = () => {
    setHoveredIdx(null);
    const pos = getPillPos(randevuRef.current);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  };

  const handleListLeave = () => {
    setHoveredIdx(null);
    const pos = getPillPos(randevuRef.current);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  };

  return (
    <nav className="font-oswald fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-sm border-b border-transparent">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-hind-vadodara font-bold text-xl text-brand-600 tracking-tight"
        >
          Beyza Şule Kahraman
        </Link>

        {/* Desktop */}
        <ul
          ref={listRef}
          className="relative hidden md:flex items-center gap-2"
          onMouseLeave={handleListLeave}
        >
          {/* Sliding pill */}
          {pillStyle && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-9 rounded-full bg-brand-500 transition-[left,width] duration-300 ease-in-out"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                opacity: pillStyle.opacity,
              }}
            />
          )}

          {links.map((l, i) => (
            <li
              key={l.href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              onMouseEnter={() => handleLinkEnter(i)}
            >
              <Link
                href={l.href}
                className={`relative z-10 block font-medium text-sm px-4 py-2 transition-colors duration-500 ${
                  hoveredIdx === i ? "text-white" : "text-gray-600"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}

          <li ref={randevuRef} onMouseEnter={handleRandevuEnter}>
            <Link
              href="/#iletisim"
              className={`relative z-10 block text-sm font-semibold px-5 py-2 rounded-full transition-colors duration-200 ${
                hoveredIdx === null ? "text-white" : "text-gray-900"
              }`}
            >
              Randevu Al
            </Link>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-gray-600"
          aria-label="Menüyü aç/kapat"
        >
          <span className="text-2xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-brand-bg/80 backdrop-blur-md border-t px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-brand-600 font-medium hover:text-brand-500 transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#iletisim"
            onClick={() => setOpen(false)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm text-center px-5 py-2.5 rounded-full transition-colors duration-200"
          >
            Randevu Al
          </Link>
        </div>
      )}
    </nav>
  );
}
