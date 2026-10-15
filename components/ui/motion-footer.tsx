"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { whatsapp } from "@/lib/order";
import StarBorder from "../react-bits/star-border";

// Adapted from the user's CinematicFooter: original bakery palette and local fonts.
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function CinematicFooter({ compact = false, hasCatalog = false }: { compact?: boolean; hasCatalog?: boolean }) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = wrapper.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(min-width: 801px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)", () => {
      root.classList.add("footer-curtain-enabled");
      const details = root.querySelector("details");
      const update = () => {
        root.classList.toggle("footer-details-open", !!details?.open);
        ScrollTrigger.refresh();
      };
      details?.addEventListener("toggle", update);
      return () => {
        details?.removeEventListener("toggle", update);
        root.classList.remove("footer-curtain-enabled", "footer-details-open");
      };
    });
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(".footer-giant-bg-text", { y: 48 }, { y: -16, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: 1 } });
        gsap.from(".footer-reveal", { y: 24, opacity: 0, stagger: .1, duration: .8, ease: "power3.out", scrollTrigger: { trigger: root, start: "top 75%", once: true } });
      }, root);
      return () => context.revert();
    });
    media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const cleanups = Array.from(root.querySelectorAll<HTMLElement>(".footer-magnetic")).map((element) => {
        const move = (event: PointerEvent) => {
          const box = element.getBoundingClientRect();
          gsap.to(element, { x: Math.max(-6, Math.min(6, (event.clientX - box.left - box.width / 2) * .08)), y: Math.max(-4, Math.min(4, (event.clientY - box.top - box.height / 2) * .08)), duration: .35, overwrite: "auto" });
        };
        const reset = () => gsap.to(element, { x: 0, y: 0, duration: .6, ease: "power3.out", overwrite: "auto" });
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerleave", reset);
        element.addEventListener("blur", reset);
        return () => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", reset);
          element.removeEventListener("blur", reset);
          gsap.killTweensOf(element);
          gsap.set(element, { clearProps: "transform" });
        };
      });
      return () => cleanups.forEach((cleanup) => cleanup());
    });
    return () => media.revert();
  }, []);
  const phrases = ["Bolos da Mi", "Feito com amor", "Produção artesanal", "Botucatu", "Sob encomenda"];
  return <div id="rodape" ref={wrapper} className={`cinematic-footer-wrapper ${compact ? "footer-compact" : ""}`} onFocusCapture={() => {
    const root = wrapper.current;
    if (root?.classList.contains("footer-curtain-enabled") && root.getBoundingClientRect().top > 0) root.scrollIntoView({ block: "end", behavior: "instant" });
  }}>
    <footer className="cinematic-footer">
      <div className="footer-aurora" aria-hidden="true" />
      <div className="footer-bg-grid" aria-hidden="true" />
      <div className="footer-giant-bg-text" aria-hidden="true">BOLOS DA MI</div>
      <div className="footer-marquee" aria-hidden="true"><div className="footer-marquee-track">{[0,1].map((copy) => <div key={copy}>{phrases.map((phrase) => <span key={phrase}>{phrase}</span>)}</div>)}</div></div>
      <div className="footer-center">
        <span className="eyebrow footer-reveal">BOLOS DA MI · CONFEITARIA ARTESANAL</span>
        <h2 className="footer-reveal">Feitos com amor.<br /><em>Para celebrar você.</em></h2>
        {!compact && <div className="footer-primary footer-reveal"><StarBorder as="a" className="button footer-magnetic" href={whatsapp("Olá, Mi! Gostaria de solicitar um orçamento.")} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" color="#c993aa" trailColor="#f7e3eb" duration={8} radius={28} thickness={1} glow={0} hover="none" clickPulse={false} backgroundColor="var(--strong)" textColor="white">Falar com a Mi pelo WhatsApp</StarBorder></div>}
        <div className="footer-links footer-reveal">
          <a className="footer-pill footer-magnetic" href="https://www.instagram.com/boloss_da_mii/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <details className="footer-more"><summary className="footer-pill">Mais informações</summary><div className="footer-extra-links"><Link href="/sobre">Sobre a Mi</Link>{hasCatalog && <Link href="/bolos">Catálogo</Link>}<Link href="/referencias">Nossas criações</Link><Link href="/agenda">Agenda</Link><Link href="/meus-pedidos">Meus pedidos</Link><Link href="/privacidade">Privacidade</Link></div></details>
        </div>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} Bolos da Mi · Confeitaria artesanal</small>
        <span className="footer-crafted">Feito com carinho em Botucatu</span>
        <a className="footer-top footer-pill footer-magnetic" href="#conteudo" aria-label="Voltar ao topo" onClick={(event) => {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          document.querySelector<HTMLAnchorElement>("header .brand")?.focus({ preventScroll: true });
        }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 10 7-7 7 7M12 3v18" /></svg></a>
      </div>
    </footer>
  </div>;
}
