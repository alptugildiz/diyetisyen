"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Register GSAP plugins once on client side.
 * Import this component in root layout.
 */
export default function GsapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    console.log("%cBuilded by 21collective.co with love ^^", "color: #10b981; font-weight: bold;");
  }, []);

  return <>{children}</>;
}
