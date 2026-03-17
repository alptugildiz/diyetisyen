"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#hakkimda", label: "Hakkımda", section: "hakkimda" },
  { href: "/hesaplamalar", label: "Hesaplamalar", section: null },
  { href: "/blog", label: "Blog", section: null },
  { href: "/sss", label: "SSS", section: null },
  { href: "/#iletisim", label: "İletişim", section: "iletisim" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isRandevuHovered, setIsRandevuHovered] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
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

  // Aktif link indexini hesapla
  const getActiveLinkIdx = (): number | null => {
    // Pathname tabanlı eşleşme (/blog, /sss, /araclar)
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (!link.section && link.href === pathname) return i;
    }
    // Ana sayfada section bazlı
    if (pathname === "/") {
      for (let i = 0; i < links.length; i++) {
        if (links[i].section && links[i].section === activeSectionId) return i;
      }
    }
    return null; // Randevu Al
  };

  const activeLinkIdx = getActiveLinkIdx();

  // IntersectionObserver — sadece ana sayfada section takibi
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSectionId(null);
      return;
    }
    const sectionIds = links
      .filter((l) => l.section)
      .map((l) => l.section as string);

    const activeSectionRef = { current: null as string | null };

    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            activeSectionRef.current = id;
            setActiveSectionId(id);
          } else if (activeSectionRef.current === id) {
            activeSectionRef.current = null;
            setActiveSectionId(null);
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((obs) => obs?.disconnect());
  }, [pathname]);

  // Pill pozisyonunu aktif linke ya da Randevu Al'a ayarla
  const moveToActive = () => {
    if (activeLinkIdx !== null) {
      const pos = getPillPos(linkRefs.current[activeLinkIdx]);
      if (pos) setPillStyle({ ...pos, opacity: 1 });
    } else {
      const pos = getPillPos(randevuRef.current);
      if (pos) setPillStyle({ ...pos, opacity: 1 });
    }
  };

  // Pathname veya active section değişince pill güncelle
  useEffect(() => {
    moveToActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLinkIdx]);

  // İlk mount
  useEffect(() => {
    moveToActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLinkEnter = (i: number) => {
    setHoveredIdx(i);
    setIsRandevuHovered(false);
    const pos = getPillPos(linkRefs.current[i]);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  };

  const handleRandevuEnter = () => {
    setHoveredIdx(null);
    setIsRandevuHovered(true);
    const pos = getPillPos(randevuRef.current);
    if (pos) setPillStyle({ ...pos, opacity: 1 });
  };

  const handleListLeave = () => {
    setHoveredIdx(null);
    setIsRandevuHovered(false);
    moveToActive();
  };

  const isActive = (i: number) => hoveredIdx === i || (hoveredIdx === null && !isRandevuHovered && activeLinkIdx === i);
  const isRandevuActive = isRandevuHovered || (hoveredIdx === null && activeLinkIdx === null);

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
          className="relative hidden md:flex items-center gap-2 top-0.5"
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
                className={`relative top-0.5 z-10 block font-medium text-sm px-4 py-2 transition-colors duration-500 ${
                  isActive(i) ? "text-white" : "text-gray-600"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}

          <li ref={randevuRef} onMouseEnter={handleRandevuEnter}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-appointment-modal"))}
              className={`relative top-0.5 z-10 block text-sm font-semibold px-5 py-2 rounded-full transition-colors duration-200 ${
                isRandevuActive ? "text-white" : "text-gray-900"
              }`}
            >
              Randevu Al
            </button>
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
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`font-medium transition-colors duration-200 ${
                activeLinkIdx === i
                  ? "text-brand-500 font-semibold"
                  : "text-brand-600 hover:text-brand-500"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("open-appointment-modal"));
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm text-center px-5 py-2.5 rounded-full transition-colors duration-200"
          >
            Randevu Al
          </button>
        </div>
      )}
    </nav>
  );
}
