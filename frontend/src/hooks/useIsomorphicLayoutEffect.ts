"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect on client, useEffect on server (SSR safe).
 * Required for GSAP animations in Next.js App Router.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;
