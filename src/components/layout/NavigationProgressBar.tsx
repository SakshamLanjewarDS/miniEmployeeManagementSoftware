"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

/**
 * Ultra-smooth, zero-dependency top navigation progress indicator.
 * Provides immediate (<10ms) tactile visual response on any route navigation click,
 * and pre-fetches any hovered internal links for instant millisecond transitions.
 */
export function NavigationProgressBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setIsNavigating(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 88;
        }
        // Smooth logarithmic deceleration
        const step = Math.max(1, (85 - prev) * 0.15);
        return Math.min(85, prev + step);
      });
    }, 120);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 280);
  };

  // Whenever pathname or searchParams change, the navigation has completed
  useEffect(() => {
    completeProgress();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [pathname, searchParams]);

  // Intercept all internal navigation link clicks for instant visual feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Only trigger for same-window internal navigation
      if (
        href &&
        !href.startsWith("#") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:") &&
        !href.startsWith("javascript:") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        // Avoid animating if clicking link to exact current URL
        if (href !== currentUrl) {
          startProgress();
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  // Universal Predictive Hover & Touch Prefetching:
  // Starts prefetching any internal link 100-200ms BEFORE the user actually clicks,
  // ensuring the destination page opens in milliseconds.
  useEffect(() => {
    const handlePrefetch = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        href &&
        href.startsWith("/w/") &&
        !href.includes("#") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:")
      ) {
        try {
          router.prefetch(href);
        } catch {
          // Ignore prefetch errors
        }
      }
    };

    document.addEventListener("mouseover", handlePrefetch, { passive: true });
    document.addEventListener("touchstart", handlePrefetch, { passive: true });
    return () => {
      document.removeEventListener("mouseover", handlePrefetch);
      document.removeEventListener("touchstart", handlePrefetch);
    };
  }, [router]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-[2.5px] overflow-hidden"
    >
      <div
        className="h-full bg-linear-to-r from-[#5A81FA] via-[#6B8EFF] to-[#2C308D] shadow-[0_0_10px_rgba(90,129,250,0.8)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "180ms" : "220ms",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
