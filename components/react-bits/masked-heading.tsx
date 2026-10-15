"use client";
// DOM adaptation of React Bits' masked reveal. Keeps approved font, color and markup.
import { Children, cloneElement, isValidElement, useEffect, useRef, type ReactNode, type CSSProperties } from "react";

export function MaskedHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      if (motion.matches) { element.classList.remove("mask-revealed"); return; }
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.classList.add("mask-revealed");
        observer?.disconnect();
      }, { threshold: .15 });
      observer.observe(element);
    };
    configure();
    motion.addEventListener("change", configure);
    return () => { observer?.disconnect(); motion.removeEventListener("change", configure); };
  }, []);
  let wordIndex = 0;
  const words = (nodes: ReactNode): ReactNode => Children.map(nodes, (node) => {
    if (typeof node === "string") return node.split(/(\s+)/).map((word, index) => /^\s*$/.test(word) ? word : <span key={index} className="mask-word"><span className="mask-glyph" style={{ "--mask-delay": `${Math.min(wordIndex++, 10) * 35}ms` } as CSSProperties}>{word}</span></span>);
    if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) return cloneElement(node, {}, words(node.props.children));
    return node;
  });
  return <span ref={ref} className="masked-heading">{words(children)}</span>;
}
