"use client";

import { useEffect, useRef } from "react";

export function ScrollEffects() {
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("main > section:not(.hero), .creation, .how-grid article"));
    const titles = Array.from(document.querySelectorAll<HTMLElement>(".intro-heading, .faq-heading"));
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0})`;
      titles.forEach((title) => {
        const distance = title.parentElement!.getBoundingClientRect().top;
        const limit = window.innerWidth < 800 ? 8 : 16;
        const offset = preference.matches ? 0 : Math.max(-limit, Math.min(limit, (window.innerHeight / 2 - distance) * .035));
        title.style.setProperty("--parallax-y", `${offset}px`);
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      observer?.disconnect();
      elements.forEach((element) => element.classList.remove("scroll-reveal"));
      titles.forEach((title) => title.classList.toggle("scroll-parallax", !preference.matches));
      update();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-arrived");
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: "0px 0px -32px 0px" });
      elements.forEach((element) => {
        element.classList.add("scroll-reveal");
        observer?.observe(element);
      });
    };
    configure();
    update();
    preference.addEventListener("change", configure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", configure);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      elements.forEach((element) => element.classList.remove("scroll-reveal", "reveal-arrived"));
      titles.forEach((title) => {
        title.classList.remove("scroll-parallax");
        title.style.removeProperty("--parallax-y");
      });
    };
  }, []);
  return <div ref={progress} className="scroll-progress" aria-hidden="true" />;
}
