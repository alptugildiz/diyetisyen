"use client";

import { useRef } from "react";
import gsap from "gsap";
import useIsomorphicLayoutEffect from "@/hooks/useIsomorphicLayoutEffect";
import Salad from "@/components/basic/salad";

export default function SaladAnimation() {
  const saladRef = useRef<SVGSVGElement>(null);

  useIsomorphicLayoutEffect(() => {
    const svg = saladRef.current;
    if (!svg) return;

    const el = (id: string) => svg.getElementById(id);
    const isMobile = window.innerWidth < 640;
    const ox = isMobile ? 40 : 90; // x offset
    const oy = isMobile ? 30 : 80; // y offset

    const allIds = [
      "bowl",
      "marul3",
      "domat2",
      "marul2",
      "marul1",
      "sogan3",
      "sogan2",
      "domat1",
      "sogan1",
      "avokado",
      "peynir2",
      "peynir1",
      "zeytin4",
      "zeytin3",
      "zeytin2",
      "zeytin1",
      "salatalik",
      "mayo",
    ];

    gsap.set(allIds.map((id) => el(id)).filter(Boolean), { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.3 });

    // 1. Kase — ekranın altından yükseliş
    tl.fromTo(
      el("bowl"),
      { opacity: 0, y: "50vh", scale: 0, transformOrigin: "center bottom" },
      { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power3.out" },
    );
    // 2. Salatalık — soldan / mobilde yukarıdan
    tl.fromTo(
      el("salatalik"),
      {
        opacity: 0,
        x: isMobile ? 0 : -ox,
        y: isMobile ? -40 : 0,
        rotation: -10,
        transformOrigin: "center",
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.28,
        ease: "power3.out",
      },
      "-=0.2",
    );
    // 4. Marul1 — sol + yukarıdan / mobilde sadece yukarıdan
    tl.fromTo(
      el("marul1"),
      { opacity: 0, x: isMobile ? 0 : -oy, y: -40 },
      { opacity: 1, x: 0, y: 0, duration: 0.28, ease: "power2.out" },
      "-=0.18",
    );
    // 5. Marul2 — sağdan / mobilde yukarıdan
    tl.fromTo(
      el("marul2"),
      { opacity: 0, x: isMobile ? 0 : oy, y: isMobile ? -40 : -20 },
      { opacity: 1, x: 0, y: 0, duration: 0.28, ease: "power2.out" },
      "-=0.2",
    );
    // 6. Marul3 — yukarıdan
    tl.fromTo(
      el("marul3"),
      { opacity: 0, y: -60 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.18",
    );
    // 7. Sogan1 — soldan / mobilde yukarıdan
    tl.fromTo(
      el("sogan1"),
      { opacity: 0, x: isMobile ? 0 : -oy, y: isMobile ? -40 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.15",
    );
    // 8. Sogan2 — sağdan / mobilde yukarıdan
    tl.fromTo(
      el("sogan2"),
      { opacity: 0, x: isMobile ? 0 : oy, y: isMobile ? -40 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.18",
    );
    // 9. Sogan3 — yukarıdan
    tl.fromTo(
      el("sogan3"),
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.15",
    );
    // 10. Domat1 — sağdan + dönerek / mobilde yukarıdan
    tl.fromTo(
      el("domat1"),
      {
        opacity: 0,
        x: isMobile ? 0 : ox,
        y: isMobile ? -40 : 0,
        rotation: 20,
        transformOrigin: "center",
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.28,
        ease: "back.out(1.4)",
      },
      "-=0.15",
    );
    // 11. Domat2 — soldan + dönerek / mobilde yukarıdan
    tl.fromTo(
      el("domat2"),
      {
        opacity: 0,
        x: isMobile ? 0 : -ox,
        y: isMobile ? -40 : 0,
        rotation: -20,
        transformOrigin: "center",
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.28,
        ease: "back.out(1.4)",
      },
      "-=0.2",
    );
    // 12. Peynir1 — çapraz / mobilde yukarıdan
    tl.fromTo(
      el("peynir1"),
      { opacity: 0, x: isMobile ? 0 : 60, y: -40 },
      { opacity: 1, x: 0, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.15",
    );
    // 13. Peynir2 — çapraz / mobilde yukarıdan
    tl.fromTo(
      el("peynir2"),
      { opacity: 0, x: isMobile ? 0 : -60, y: -40 },
      { opacity: 1, x: 0, y: 0, duration: 0.25, ease: "power2.out" },
      "-=0.2",
    );
    // 14. Avokado — sağdan / mobilde yukarıdan
    tl.fromTo(
      el("avokado"),
      {
        opacity: 0,
        x: isMobile ? 0 : oy,
        y: isMobile ? -40 : 0,
        scale: 0.7,
        transformOrigin: "center",
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.28,
        ease: "back.out(1.8)",
      },
      "-=0.15",
    );
    // 15. Zeytinler — stagger scale
    tl.fromTo(
      ["zeytin1", "zeytin2", "zeytin3", "zeytin4"]
        .map((id) => el(id))
        .filter(Boolean),
      { opacity: 0, scale: 0, transformOrigin: "center" },
      {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        ease: "back.out(2)",
        stagger: 0.05,
      },
      "-=0.15",
    );
    // 16. Mayo — tepeden son iniş
    tl.fromTo(
      el("mayo"),
      { opacity: 0, y: -300, rotation: -10, transformOrigin: "center" },
      { opacity: 1, y: 0, rotation: 0, duration: 0.45, ease: "power2.out" },
      "-=0.05",
    );
    // 17. Son bounce
    tl.to(
      svg,
      { y: -8, duration: 0.25, ease: "power1.out", yoyo: true, repeat: 1 },
      "-=0.05",
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="w-full flex items-center justify-center">
      <Salad
        ref={saladRef}
        className="w-full  min-h-420px h-auto drop-shadow-xl"
      />
    </div>
  );
}
