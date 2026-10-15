"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
export function Verification({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const widget = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!ready || !key || !ref.current || !widget) return;
    const id = widget.render(ref.current, {
      sitekey: key,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => widget.remove(id);
  }, [ready, key, onToken]);
  if (!key) return null;
  return (
    <div>
      <p className="hint">Verificação de segurança</p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={ref} />
    </div>
  );
}
