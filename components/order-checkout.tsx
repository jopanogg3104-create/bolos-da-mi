"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { customerDb } from "@/lib/supabase";
import { money, whatsapp } from "@/lib/order";
import type { QuoteResult } from "@/lib/commerce";
import { Verification } from "./verification";
export type OrderInput = {
  kind: "cake" | "cart";
  method: string;
  date: string;
  time: string;
  selection?: {
    size: string;
    batter: string;
    decoration: string;
    fillings: string[];
    extras: string[];
  };
  items?: { id: string; quantity: number }[];
  details: Record<string, string>;
  honeypot?: string;
};
export type SavedOrder = { id: string; token: string; created_at: string };
function randomToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export function Checkout({
  input,
  message,
  canRegister,
}: {
  input: OrderInput;
  message: string;
  canRegister: boolean;
}) {
  const serialized = JSON.stringify(input),
    [quote, setQuote] = useState<QuoteResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<{
      id: string;
      token: string;
      estimated_total: number | null;
    } | null>(null),
    [copied, setCopied] = useState(false),
    [honeypot, setHoneypot] = useState(""),
    [captcha, setCaptcha] = useState("");
  const attempt = useRef<{ request_id: string; access_token: string } | null>(
    null,
  );
  useEffect(() => {
    setSaved(null);
    attempt.current = null;
    setQuote(null);
    setError("");
    const controller = new AbortController();
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setQuote(data);
        else if (r.status !== 503) setError(data.error);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [serialized]);
  async function register() {
    if (busy || saved) return;
    setBusy(true);
    setError("");
    try {
      const db = customerDb();
      if (!db) throw new Error("O serviço de encomendas não está configurado.");
      let {
        data: { session },
      } = await db.auth.getSession();
      if (!session) {
        const { data, error } = await db.auth.signInAnonymously(
          captcha ? { options: { captchaToken: captcha } } : undefined,
        );
        if (error || !data.session)
          throw new Error(
            "Não foi possível iniciar o acompanhamento do pedido. Tente novamente ou converse com a Mi pelo WhatsApp.",
          );
        session = data.session;
      }
      attempt.current ??= {
        request_id: crypto.randomUUID(),
        access_token: randomToken(),
      };
      const currentAttempt = attempt.current;
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          input: { ...input, honeypot },
          ...currentAttempt,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const token = currentAttempt.access_token;
      setSaved({ ...data, token });
      try {
        const old = JSON.parse(localStorage.getItem("mi-orders") ?? "[]");
        const list: Array<SavedOrder> = Array.isArray(old)
          ? old.filter(
              (o) =>
                o &&
                typeof o.token === "string" &&
                /^[a-f0-9]{64}$/.test(o.token),
            )
          : [];
        if (!list.some((o) => o.id === data.id))
          localStorage.setItem(
            "mi-orders",
            JSON.stringify(
              [
                ...list,
                { id: data.id, token, created_at: new Date().toISOString() },
              ].slice(-30),
            ),
          );
      } catch {
        setError(
          "Pedido registrado. Guarde o código de acesso abaixo: este navegador não permitiu salvá-lo.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível registrar a solicitação.",
      );
    } finally {
      setBusy(false);
    }
  }
  const text = saved
    ? `Solicitação ${saved.id}\n\n${message}\n\nOrçamento: ${saved.estimated_total === null ? "Preço sob consulta." : money(saved.estimated_total)}`
    : message;
  return (
    <div className="checkout">
      <div className="quote-box">
        <span className="eyebrow">ORÇAMENTO ESTIMADO</span>
        <h3>
          {quote?.total != null ? money(quote.total) : "Preço sob consulta."}
        </h3>
        {quote?.lines?.length ? (
          <dl className="summary">
            {quote.lines.map((line, i) => (
              <div key={i}>
                <dt>{line.label}</dt>
                <dd>
                  {line.amount === null ? "Sob consulta" : money(line.amount)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="hint">
          Valor e disponibilidade sujeitos à confirmação da confeiteira. O envio
          não confirma a encomenda nem o pagamento.
        </p>
      </div>
      <label className="bot-field" aria-hidden="true">
        Não preencha este campo
        <input
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </label>
      {canRegister && !saved && (
        <>
          <Verification onToken={setCaptcha} />
          <button
            type="button"
            className="button"
            disabled={
              busy || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)
            }
            onClick={() => void register()}
          >
            {busy
              ? "Registrando solicitação…"
              : "Registrar solicitação e continuar"}
          </button>
          <p className="hint">
            Registramos suas escolhas sem pedir nome ou telefone. Depois você
            abre o WhatsApp para conversar com a Mi.
          </p>
        </>
      )}
      {saved && (
        <div className="registered" role="status">
          <h3>Solicitação recebida.</h3>
          <p>
            Pedido {saved.id.slice(0, 8).toUpperCase()}. A Mi ainda precisa
            confirmar a encomenda.
          </p>
          <Link className="text-link" href={`/meus-pedidos#${saved.token}`}>
            Acompanhar este pedido →
          </Link>
          <details>
            <summary>Guardar código de acesso</summary>
            <code className="access-code">{saved.token}</code>
            <button
              type="button"
              className="text-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(saved.token);
                  setCopied(true);
                } catch {
                  setError("Copie o código exibido acima manualmente.");
                }
              }}
            >
              {copied ? "Código copiado" : "Copiar código"}
            </button>
            <p className="hint">
              Esse código dá acesso ao seu pedido. Não compartilhe com outras
              pessoas.
            </p>
          </details>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <a
        className={`button ${canRegister && !saved ? "secondary" : ""}`}
        href={whatsapp(text)}
        target="_blank"
        rel="noreferrer"
      >
        {canRegister && !saved
          ? "Consultar a Mi pelo WhatsApp"
          : "Enviar pedido pelo WhatsApp"}{" "}
        ↗
      </a>
      {!canRegister && (
        <p className="hint">
          Esta conversa pelo WhatsApp não registra nem reserva um horário na
          agenda online.
        </p>
      )}
    </div>
  );
}
