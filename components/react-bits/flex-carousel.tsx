"use client";
// Responsive DOM adaptation: expandable panels, original media, no WebGL distortion.
import { useId, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Creation } from "@/lib/types";
import { OriginalVideo } from "../video";

export function FlexCarousel({ items }: { items: Creation[] }) {
  const [active, setActive] = useState(0);
  const controls = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const pageStart = Math.floor(active / 4) * 4;
  const panelCount = Math.min(4, items.length - pageStart);
  return <div className="flex-showcase" role="region" aria-label="Criações da Bolos da Mi">
    <div className="flex-carousel-controls" role="tablist" aria-label="Escolher uma criação">{items.map((item, index) => <button key={item.id} ref={(element) => { controls.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % items.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      else return;
      event.preventDefault(); setActive(next); controls.current[next]?.focus();
    }} aria-label={`Selecionar criação ${index + 1}`}>{String(index + 1).padStart(2, "0")}</button>)}</div>
    <div className="flex-carousel" style={{"--panel-count": panelCount} as CSSProperties}>{items.map((item, index) => <article className="flex-panel" hidden={index < pageStart || index >= pageStart + 4} key={item.id} data-active={active === index} onPointerMove={(event) => { if (event.pointerType === "mouse" && (event.movementX || event.movementY)) setActive(index); }}>
      <div className="flex-media" id={`${id}-panel-${index}`} role="tabpanel" aria-hidden={active !== index} aria-labelledby={`${id}-tab-${index}`}>
        {active === index && item.video_url ? <OriginalVideo src={item.video_url} poster={item.image_url} label={item.title} /> : item.image_url ? <Image src={item.image_url} alt={item.title} fill sizes={active === index ? "(max-width: 800px) 75vw, 65vw" : "15vw"} unoptimized={!item.image_url.startsWith("/")} /> : null}
        {active !== index && <button type="button" className="flex-panel-select" onClick={() => setActive(index)} aria-label={`Expandir criação ${index + 1}`} tabIndex={-1} />}
      </div>
    </article>)}</div>
    <Link className="text-link flex-reference" href={`/monte-seu-bolo?referencia=${encodeURIComponent(items[active].title + " [" + items[active].id + "]")}`}>Quero um bolo assim</Link>
  </div>;
}
