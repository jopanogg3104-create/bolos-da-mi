"use client";
import { useEffect, useState } from "react";
import { statusLabel } from "@/lib/commerce";
import { money, whatsapp } from "@/lib/order";
import type { SavedOrder } from "./order-checkout";
type Tracked = {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  method: string;
  estimated_total: number | null;
  final_total: number | null;
  deposit_due: number | null;
  paid_amount: number;
  payment_status: string;
  pix_key: string | null;
  hold_expires_at: string;
  details: Record<string, unknown>;
};
export function MyOrders() {
  const [saved, setSaved] = useState<SavedOrder[]>([]),
    [token, setToken] = useState(""),
    [order, setOrder] = useState<Tracked | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("mi-orders") ?? "[]");
      if (Array.isArray(list))
        setSaved(list.filter((o) => o && /^[a-f0-9]{64}$/.test(o.token)));
    } catch {}
    const hash = location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(hash)) {
      setToken(hash);
      void load(hash);
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  async function load(code: string) {
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      const r = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setOrder(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível consultar o pedido.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">CADA DETALHE ACOMPANHADO</span>
          <h1>Meus pedidos</h1>
        </div>
        <p>
          Acompanhe as solicitações deste navegador ou use seu código privado de
          acesso. Não pedimos nome nem telefone.
        </p>
      </div>
      <div className="tracking-layout">
        <aside>
          <h2>Suas solicitações</h2>
          {saved.length ? (
            <ul className="saved-orders">
              {saved.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() => {
                      setToken(s.token);
                      void load(s.token);
                    }}
                  >
                    Pedido {s.id.slice(0, 8).toUpperCase()}
                  </button>
                  <small>
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">
              Nenhuma solicitação registrada neste navegador. Conversas enviadas
              somente pelo WhatsApp não aparecem aqui.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(token);
            }}
          >
            <label>
              Código privado de acesso
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                required
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Consultando…" : "Consultar pedido"}
            </button>
          </form>
          <p className="hint">
            Não compartilhe seu código. Ele dá acesso aos detalhes do pedido.
          </p>
        </aside>
        <div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {order && (
            <article className="order-detail">
              <span className="eyebrow">
                PEDIDO {order.id.slice(0, 8).toUpperCase()}
              </span>
              <h2>{statusLabel(order.status)}</h2>
              <dl className="summary">
                {[
                  [
                    "Data",
                    order.scheduled_date?.split("-").reverse().join("/"),
                  ],
                  ["Horário", order.scheduled_time?.slice(0, 5)],
                  ["Modalidade", order.method],
                  [
                    "Orçamento estimado",
                    order.estimated_total === null
                      ? "Preço sob consulta."
                      : money(order.estimated_total),
                  ],
                  [
                    "Valor aprovado",
                    order.final_total === null
                      ? "A confirmar"
                      : money(order.final_total),
                  ],
                  [
                    "Sinal solicitado",
                    order.deposit_due === null
                      ? "A confirmar"
                      : money(order.deposit_due),
                  ],
                  ["Valor registrado como recebido", money(order.paid_amount)],
                  [
                    "Saldo",
                    order.final_total === null
                      ? "A confirmar"
                      : money(
                          Math.max(0, order.final_total - order.paid_amount),
                        ),
                  ],
                  [
                    "Pagamento",
                    (
                      {
                        pendente: "Pendente",
                        parcial: "Parcial",
                        pago: "Pago",
                        reembolsado: "Reembolsado",
                      } as Record<string, string>
                    )[order.payment_status],
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "A combinar"}</dd>
                  </div>
                ))}
              </dl>
              {order.status === "recebido" && order.hold_expires_at && (
                <p className="hint">
                  A solicitação aguarda avaliação. Reserva provisória do horário
                  até{" "}
                  {new Date(order.hold_expires_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                  ; a expiração não confirma nem cancela a encomenda.
                </p>
              )}
              {order.pix_key && (
                <div className="quote-box">
                  <h3>Pagamento via Pix</h3>
                  <p>Utilize a chave fornecida pela confeiteira:</p>
                  <code className="access-code">{order.pix_key}</code>
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(order.pix_key!);
                        setCopied(true);
                      } catch {
                        setError("Copie a chave exibida acima manualmente.");
                      }
                    }}
                  >
                    {copied ? "Chave copiada" : "Copiar chave Pix"}
                  </button>
                  <p className="hint">
                    A Mi verifica o recebimento e atualiza o pagamento
                    manualmente. O site não confirma pagamentos automaticamente.
                  </p>
                </div>
              )}
              <details>
                <summary>Detalhes da solicitação</summary>
                <dl className="summary">
                  {Object.entries(
                    (order.details.preferences ?? {}) as Record<string, string>,
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>
                          {(
                            {
                              occasion: "Ocasião",
                              size_preference: "Tamanho",
                              batter_preference: "Massa",
                              style_preference: "Estilo",
                              theme: "Tema",
                              colors: "Cores",
                              message: "Mensagem",
                              reference: "Referência",
                              notes: "Observações",
                              address: "Endereço",
                            } as Record<string, string>
                          )[k] ?? k}
                        </dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              </details>
              <a
                className="button secondary"
                href={whatsapp(
                  `Olá, Mi! Gostaria de conversar sobre a solicitação ${order.id}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Conversar sobre este pedido ↗
              </a>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
