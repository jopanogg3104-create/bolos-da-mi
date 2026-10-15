"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  brazilDate,
  emptyCommerce,
  orderStatuses,
  statusLabel,
  validateSchedule,
  type CommerceConfig,
  type ScheduleConfig,
  type TimeSlot,
} from "@/lib/commerce";
import { money } from "@/lib/order";
type RecordRow = Record<string, unknown>;
function useCommerce(db: SupabaseClient) {
  const [config, setConfig] = useState<CommerceConfig>(emptyCommerce),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    db.from("commerce_settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error)
          setError("Aplique a migração do sistema de encomendas no Supabase.");
        else if (data) setConfig(data);
        setLoading(false);
      });
  }, [db]);
  return { config, setConfig, error, setError, loading };
}
function SlotsEditor({
  slots,
  onChange,
}: {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}) {
  return (
    <fieldset>
      <legend>Horários disponíveis por modalidade</legend>
      <p className="hint">
        Cadastre os horários atendidos. Para criar um intervalo sem atendimento,
        deixe os horários desse intervalo fora da lista.
      </p>
      {slots.map((slot, i) => (
        <div className="slot-row" key={i}>
          <label>
            Horário
            <input
              type="time"
              required
              value={slot.time}
              onChange={(e) =>
                onChange(
                  slots.map((s, n) =>
                    n === i ? { ...s, time: e.target.value } : s,
                  ),
                )
              }
            />
          </label>
          <label>
            Modalidade
            <select
              value={slot.method}
              onChange={(e) =>
                onChange(
                  slots.map((s, n) =>
                    n === i
                      ? { ...s, method: e.target.value as TimeSlot["method"] }
                      : s,
                  ),
                )
              }
            >
              <option>Retirada</option>
              <option>Entrega</option>
            </select>
          </label>
          <label>
            Vagas
            <input
              type="number"
              min="1"
              max="1000"
              required
              value={slot.capacity}
              onChange={(e) =>
                onChange(
                  slots.map((s, n) =>
                    n === i ? { ...s, capacity: Number(e.target.value) } : s,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() => onChange(slots.filter((_, n) => n !== i))}
          >
            Remover horário
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          onChange([...slots, { time: "", method: "Retirada", capacity: 1 }])
        }
      >
        Adicionar horário +
      </button>
    </fieldset>
  );
}
function CategoryLimits({
  limits,
  onChange,
}: {
  limits: Record<string, number>;
  onChange: (limits: Record<string, number>) => void;
}) {
  const [name, setName] = useState("");
  return (
    <fieldset>
      <legend>Limites por categoria (opcional)</legend>
      {Object.entries(limits).map(([category, limit]) => (
        <div className="slot-row" key={category}>
          <label>
            {category}
            <input
              type="number"
              min="0"
              value={limit}
              onChange={(e) =>
                onChange({ ...limits, [category]: Number(e.target.value) })
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              const next = { ...limits };
              delete next[category];
              onChange(next);
            }}
          >
            Remover limite
          </button>
        </div>
      ))}
      <div className="slot-row">
        <label>
          Nome da categoria
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome idêntico ao catálogo"
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!name.trim()}
          onClick={() => {
            onChange({ ...limits, [name.trim()]: 0 });
            setName("");
          }}
        >
          Adicionar limite
        </button>
      </div>
      <p className="hint">
        Para o configurador, utilize a categoria “Bolos personalizados”. Zero
        impede novas encomendas dessa categoria.
      </p>
    </fieldset>
  );
}
export function AgendaAdmin({ db }: { db: SupabaseClient }) {
  const { config, setConfig, error, setError, loading } = useCommerce(db);
  const [dates, setDates] = useState<RecordRow[]>([]),
    [orders, setOrders] = useState<RecordRow[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [start, setStart] = useState(brazilDate()),
    [end, setEnd] = useState(brazilDate()),
    [blocked, setBlocked] = useState(true),
    [capacity, setCapacity] = useState(""),
    [notes, setNotes] = useState(""),
    [special, setSpecial] = useState(false),
    [specialSlots, setSpecialSlots] = useState<TimeSlot[]>([]),
    [limits, setLimits] = useState<Record<string, number>>({}),
    [useLimits, setUseLimits] = useState(false),
    [units, setUnits] = useState("");
  async function refresh() {
    const results = await Promise.all([
      db.from("schedule_dates").select("*").order("date"),
      db
        .from("orders")
        .select(
          "id,status,scheduled_date,scheduled_time,method,hold_expires_at",
        )
        .gte("scheduled_date", brazilDate())
        .order("scheduled_date"),
    ]);
    if (results.some((r) => r.error))
      setError(
        "Não foi possível carregar a agenda. Confira a migração e as permissões.",
      );
    else {
      setDates(results[0].data ?? []);
      setOrders(results[1].data ?? []);
    }
  }
  useEffect(() => {
    void refresh();
  }, [db]);
  const setSchedule = (value: Partial<ScheduleConfig>) =>
    setConfig((c) => ({ ...c, schedule: { ...c.schedule, ...value } }));
  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const invalid = validateSchedule(config.schedule);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const { error } = await db.from("commerce_settings").upsert(config);
    setBusy(false);
    setError(error ? "Não foi possível salvar a configuração." : "");
    if (!error) setMessage("Regras de atendimento salvas.");
  }
  async function saveDates(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const from = new Date(start + "T12:00:00Z"),
      until = new Date(end + "T12:00:00Z");
    const count = (until.getTime() - from.getTime()) / 86400000 + 1;
    if (!Number.isInteger(count) || count < 1 || count > 366) {
      setError("Escolha um período de até 366 dias.");
      return;
    }
    if (special) {
      const invalid = validateSchedule({
        ...config.schedule,
        enabled: false,
        slots: specialSlots,
      });
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (
      capacity !== "" &&
      (!Number.isInteger(Number(capacity)) ||
        Number(capacity) < 0 ||
        Number(capacity) > 1000)
    ) {
      setError("Revise a capacidade da data.");
      return;
    }
    const records = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      records.push({
        date: d.toISOString().slice(0, 10),
        blocked,
        capacity: capacity === "" ? null : Number(capacity),
        slots: special ? specialSlots : null,
        category_limits: useLimits ? limits : null,
        complexity_capacity: units ? Number(units) : null,
        internal_notes: notes,
      });
    }
    setBusy(true);
    const { error } = await db
      .from("schedule_dates")
      .upsert(records, { onConflict: "date" });
    setBusy(false);
    setError(error ? "Não foi possível salvar as exceções." : "");
    if (!error) {
      setMessage(
        "Datas atualizadas. Pedidos existentes devem ser revisados pela confeiteira.",
      );
      await refresh();
    }
  }
  if (loading) return <p role="status">Carregando regras…</p>;
  return (
    <section>
      <h2>Agenda inteligente</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <form onSubmit={saveConfig}>
        <h3>Regras de atendimento</h3>
        <div className="admin-grid">
          <label>
            Agenda online
            <select
              value={String(config.schedule.enabled)}
              onChange={(e) =>
                setSchedule({ enabled: e.target.value === "true" })
              }
            >
              <option value="false">Fechada</option>
              <option value="true">Aberta</option>
            </select>
          </label>
          <label>
            Máximo de encomendas por dia
            <input
              type="number"
              min="0"
              max="1000"
              required
              value={config.schedule.daily_capacity}
              onChange={(e) =>
                setSchedule({ daily_capacity: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Antecedência mínima (horas)
            <input
              type="number"
              min="0"
              max="8760"
              required
              value={config.schedule.notice_hours}
              onChange={(e) =>
                setSchedule({ notice_hours: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Capacidade por complexidade (opcional)
            <input
              type="number"
              min="1"
              value={config.schedule.complexity_capacity ?? ""}
              onChange={(e) =>
                setSchedule({
                  complexity_capacity: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </label>
          <label>
            Reserva provisória de pedidos pendentes (horas)
            <input
              type="number"
              min="1"
              max="168"
              value={Number(
                (config as unknown as RecordRow).pending_hold_hours ?? 24,
              )}
              onChange={(e) =>
                setConfig({
                  ...config,
                  ...{ pending_hold_hours: Number(e.target.value) },
                } as CommerceConfig)
              }
            />
          </label>
        </div>
        <fieldset>
          <legend>Dias de atendimento</legend>
          <div className="choices">
            {[
              "Domingo",
              "Segunda",
              "Terça",
              "Quarta",
              "Quinta",
              "Sexta",
              "Sábado",
            ].map((day, i) => (
              <label className="choice" key={day}>
                <input
                  type="checkbox"
                  checked={config.schedule.weekdays.includes(i)}
                  onChange={(e) =>
                    setSchedule({
                      weekdays: e.target.checked
                        ? [...config.schedule.weekdays, i]
                        : config.schedule.weekdays.filter((d) => d !== i),
                    })
                  }
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
        <SlotsEditor
          slots={config.schedule.slots}
          onChange={(slots) => setSchedule({ slots })}
        />
        <CategoryLimits
          limits={config.schedule.category_limits}
          onChange={(category_limits) => setSchedule({ category_limits })}
        />
        <button className="button" disabled={busy}>
          Salvar regras de atendimento
        </button>
      </form>
      <form onSubmit={saveDates} className="admin-subsection">
        <h3>Bloqueios e datas especiais</h3>
        <div className="admin-grid">
          <label>
            De
            <input
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              required
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            Atendimento
            <select
              value={String(blocked)}
              onChange={(e) => setBlocked(e.target.value === "true")}
            >
              <option value="true">
                Bloquear (férias, feriado ou indisponibilidade)
              </option>
              <option value="false">Permitir conforme regras</option>
            </select>
          </label>
          <label>
            Capacidade especial (vazio usa regra geral)
            <input
              type="number"
              min="0"
              max="1000"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label>
            Complexidade especial (opcional)
            <input
              type="number"
              min="1"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </label>
          <label className="wide">
            Observações internas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1500}
            />
          </label>
        </div>
        <label className="choice">
          <input
            type="checkbox"
            checked={special}
            onChange={(e) => setSpecial(e.target.checked)}
          />
          Definir horários especiais para essas datas
        </label>
        {special && (
          <SlotsEditor slots={specialSlots} onChange={setSpecialSlots} />
        )}
        <label className="choice">
          <input
            type="checkbox"
            checked={useLimits}
            onChange={(e) => setUseLimits(e.target.checked)}
          />
          Definir limites especiais por categoria
        </label>
        {useLimits && <CategoryLimits limits={limits} onChange={setLimits} />}
        <button className="button" disabled={busy}>
          Salvar período
        </button>
      </form>
      <h3 className="admin-subsection">Exceções cadastradas</h3>
      <div className="admin-list">
        {dates.map((d) => (
          <article className="admin-row" key={String(d.id)}>
            <strong>
              {String(d.date).split("-").reverse().join("/")} ·{" "}
              {d.blocked ? "Bloqueada" : "Regra especial"}
            </strong>
            <span>{String(d.internal_notes)}</span>
            <button
              className="text-link"
              onClick={() => {
                setStart(String(d.date));
                setEnd(String(d.date));
                setBlocked(Boolean(d.blocked));
                setCapacity(d.capacity == null ? "" : String(d.capacity));
                setNotes(String(d.internal_notes));
                setSpecial(d.slots !== null);
                setSpecialSlots((d.slots as TimeSlot[]) ?? []);
                setUseLimits(d.category_limits !== null);
                setLimits((d.category_limits as Record<string, number>) ?? {});
                setUnits(
                  d.complexity_capacity == null
                    ? ""
                    : String(d.complexity_capacity),
                );
              }}
            >
              Editar
            </button>
            {!!d.blocked && (
              <button
                className="text-link"
                onClick={async () => {
                  const { error } = await db
                    .from("schedule_dates")
                    .update({ blocked: false })
                    .eq("id", d.id);
                  if (error) setError("Não foi possível desbloquear.");
                  else void refresh();
                }}
              >
                Desbloquear
              </button>
            )}
          </article>
        ))}
      </div>
      <h3>Próximas encomendas</h3>
      {orders.length ? (
        <div className="admin-list">
          {orders.map((o) => (
            <article className="admin-row" key={String(o.id)}>
              <strong>Pedido {String(o.id).slice(0, 8).toUpperCase()}</strong>
              <span>
                {String(o.scheduled_date).split("-").reverse().join("/")} ·{" "}
                {String(o.scheduled_time).slice(0, 5)} · {String(o.method)}
              </span>
              <span>{statusLabel(String(o.status))}</span>
            </article>
          ))}
        </div>
      ) : (
        <p>Nenhuma encomenda futura cadastrada.</p>
      )}
    </section>
  );
}
export function FinanceSettings({ db }: { db: SupabaseClient }) {
  const { config, setConfig, error, setError, loading } = useCommerce(db);
  const [options, setOptions] = useState<RecordRow[]>([]),
    [first, setFirst] = useState(""),
    [second, setSecond] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    db.from("options")
      .select("id,label")
      .eq("kind", "filling")
      .eq("active", true)
      .then(({ data }) => setOptions(data ?? []));
  }, [db]);
  if (loading) return <p>Carregando configurações…</p>;
  return (
    <section>
      <h2>Orçamento e Pix</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await db.from("commerce_settings").upsert(config);
          setBusy(false);
          setError(error ? "Não foi possível salvar. Confira os valores." : "");
          if (!error) setMessage("Configuração financeira salva.");
        }}
      >
        <div className="admin-grid">
          <label>
            Cálculo do configurador
            <select
              value={String(config.pricing_enabled)}
              onChange={(e) =>
                setConfig({
                  ...config,
                  pricing_enabled: e.target.value === "true",
                })
              }
            >
              <option value="false">Preço sob consulta</option>
              <option value="true">
                Tamanho + massa + recheios + decoração + adicionais
              </option>
            </select>
          </label>
          <label>
            Taxa de entrega (vazio: sob consulta)
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.delivery_fee ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  delivery_fee: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Chave Pix
            <input
              value={config.pix_key}
              maxLength={200}
              onChange={(e) =>
                setConfig({ ...config, pix_key: e.target.value })
              }
            />
          </label>
          <label>
            Sinal sugerido (% opcional)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.deposit_percent ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  deposit_percent: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </label>
        </div>
        <p className="hint">
          Preços iguais a zero devem ser cadastrados explicitamente. A chave Pix
          só é apresentada ao cliente no acesso privado de um pedido com valor
          aprovado e status “Aguardando pagamento”. A confirmação de recebimento
          é manual.
        </p>
        <fieldset>
          <legend>Combinações de recheios incompatíveis</legend>
          <div className="slot-row">
            <label>
              Primeiro recheio
              <select value={first} onChange={(e) => setFirst(e.target.value)}>
                <option value="">Selecionar</option>
                {options.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Segundo recheio
              <select
                value={second}
                onChange={(e) => setSecond(e.target.value)}
              >
                <option value="">Selecionar</option>
                {options.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              disabled={!first || !second || first === second}
              onClick={() => {
                setConfig({
                  ...config,
                  fillings_incompatible: [
                    ...config.fillings_incompatible,
                    [first, second],
                  ],
                });
                setFirst("");
                setSecond("");
              }}
            >
              Impedir combinação
            </button>
          </div>
          {config.fillings_incompatible.map((pair, i) => (
            <div className="admin-row" key={i}>
              <span>
                {pair
                  .map((id) =>
                    String(
                      options.find((o) => o.id === id)?.label ??
                        "Recheio removido",
                    ),
                  )
                  .join(" + ")}
              </span>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setConfig({
                    ...config,
                    fillings_incompatible: config.fillings_incompatible.filter(
                      (_, n) => n !== i,
                    ),
                  })
                }
              >
                Remover regra
              </button>
            </div>
          ))}
        </fieldset>
        <button className="button" disabled={busy}>
          Salvar orçamento e Pix
        </button>
      </form>
    </section>
  );
}
export function Dashboard({ db }: { db: SupabaseClient }) {
  const [rows, setRows] = useState<RecordRow[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    db.from("orders")
      .select(
        "id,status,scheduled_date,scheduled_time,method,paid_amount,payment_status",
      )
      .order("scheduled_date")
      .then(({ data, error }) => {
        if (error)
          setError("Não foi possível carregar os pedidos. Confira a migração.");
        else setRows(data ?? []);
        setLoading(false);
      });
  }, [db]);
  if (loading) return <p>Carregando painel…</p>;
  const today = brazilDate();
  const confirmed = ["confirmado", "em_producao", "pronto", "saiu_entrega"];
  return (
    <section>
      <h2>Seu dia no ateliê</h2>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="dashboard-stats">
            {[
              [
                "Solicitações recebidas",
                rows.filter((r) => r.status === "recebido").length,
              ],
              [
                "Pendentes",
                rows.filter(
                  (r) =>
                    !["cancelado", "concluido", ...confirmed].includes(
                      String(r.status),
                    ),
                ).length,
              ],
              [
                "Confirmadas",
                rows.filter((r) => confirmed.includes(String(r.status))).length,
              ],
              [
                "Recebimentos registrados",
                money(
                  rows.reduce(
                    (n, r) =>
                      n +
                      (r.payment_status === "reembolsado"
                        ? 0
                        : Number(r.paid_amount ?? 0)),
                    0,
                  ),
                ),
              ],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <h3>Agenda de hoje</h3>
          <OrderAgenda
            rows={rows.filter(
              (r) => r.scheduled_date === today && r.status !== "cancelado",
            )}
          />
          <h3>Próximas entregas e retiradas</h3>
          <OrderAgenda
            rows={rows
              .filter(
                (r) =>
                  String(r.scheduled_date) > today &&
                  confirmed.includes(String(r.status)),
              )
              .slice(0, 15)}
          />
        </>
      )}
    </section>
  );
}
function OrderAgenda({ rows }: { rows: RecordRow[] }) {
  return rows.length ? (
    <div className="admin-list">
      {rows.map((r) => (
        <article className="admin-row" key={String(r.id)}>
          <strong>{String(r.id).slice(0, 8).toUpperCase()}</strong>
          <span>
            {String(r.scheduled_date).split("-").reverse().join("/")} ·{" "}
            {String(r.scheduled_time).slice(0, 5)} · {String(r.method)}
          </span>
          <span>{statusLabel(String(r.status))}</span>
        </article>
      ))}
    </div>
  ) : (
    <p className="hint">Nenhuma encomenda neste período.</p>
  );
}
export function OrdersAdmin({ db }: { db: SupabaseClient }) {
  const [rows, setRows] = useState<RecordRow[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState(""),
    [editing, setEditing] = useState<RecordRow | null>(null),
    [percent, setPercent] = useState<number | null>(null);
  async function load() {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error)
      setError("Não foi possível carregar os pedidos. Confira a migração.");
    else {
      setRows(data ?? []);
      setError("");
    }
  }
  useEffect(() => {
    void load();
    db.from("commerce_settings")
      .select("deposit_percent")
      .eq("id", "main")
      .maybeSingle()
      .then(({ data }) => setPercent(data?.deposit_percent ?? null));
  }, [db]);
  return (
    <section>
      <h2>Pedidos e pagamentos</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <label>
        Filtrar por status
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos</option>
          {orderStatuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Exibindo até 500 solicitações recentes. Orçamentos pelo WhatsApp sem
        registro no site não aparecem nesta lista.
      </p>
      {!editing && (
        <div className="admin-list">
          {rows
            .filter((r) => !filter || r.status === filter)
            .map((r) => (
              <article className="admin-row" key={String(r.id)}>
                <strong>Pedido {String(r.id).slice(0, 8).toUpperCase()}</strong>
                <span>{statusLabel(String(r.status))}</span>
                <span>
                  {String(r.scheduled_date ?? "A combinar")} ·{" "}
                  {String(r.scheduled_time ?? "").slice(0, 5)}
                </span>
                <button
                  className="text-link"
                  onClick={() => setEditing({ ...r })}
                >
                  Ver e atualizar
                </button>
              </article>
            ))}
        </div>
      )}
      {editing && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const updates = {
              status: editing.status,
              scheduled_date: editing.scheduled_date,
              scheduled_time: editing.scheduled_time,
              method: editing.method,
              final_total:
                editing.final_total === "" ? null : editing.final_total,
              deposit_due:
                editing.deposit_due === "" ? null : editing.deposit_due,
              paid_amount: editing.paid_amount,
              payment_status: editing.payment_status,
            };
            const { error } = await db
              .from("orders")
              .update(updates)
              .eq("id", editing.id);
            setBusy(false);
            if (error)
              setError(
                "Não foi possível atualizar. Confira capacidade da agenda, status e valores financeiros.",
              );
            else {
              setEditing(null);
              setMessage(
                "Pedido atualizado. O cliente verá o novo status no acesso privado.",
              );
              await load();
            }
          }}
        >
          <h3>Pedido {String(editing.id).slice(0, 8).toUpperCase()}</h3>
          <div className="admin-grid">
            <label>
              Status
              <select
                value={String(editing.status)}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                {orderStatuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modalidade
              <select
                value={String(editing.method)}
                onChange={(e) =>
                  setEditing({ ...editing, method: e.target.value })
                }
              >
                <option>Retirada</option>
                <option>Entrega</option>
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                required
                value={String(editing.scheduled_date ?? "")}
                onChange={(e) =>
                  setEditing({ ...editing, scheduled_date: e.target.value })
                }
              />
            </label>
            <label>
              Horário
              <input
                type="time"
                required
                value={String(editing.scheduled_time ?? "").slice(0, 5)}
                onChange={(e) =>
                  setEditing({ ...editing, scheduled_time: e.target.value })
                }
              />
            </label>
            <label>
              Valor final aprovado
              <input
                type="number"
                min="0"
                step="0.01"
                value={String(editing.final_total ?? "")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    final_total: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label>
              Sinal solicitado
              <input
                type="number"
                min="0"
                step="0.01"
                value={String(editing.deposit_due ?? "")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    deposit_due: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            {percent !== null && editing.final_total != null && (
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setEditing({
                    ...editing,
                    deposit_due:
                      Math.round(Number(editing.final_total) * percent) / 100,
                  })
                }
              >
                Aplicar sinal de {percent}%
              </button>
            )}
            <label>
              Valor recebido e conferido manualmente
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number(editing.paid_amount ?? 0)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    paid_amount: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Pagamento
              <select
                value={String(editing.payment_status ?? "pendente")}
                onChange={(e) =>
                  setEditing({ ...editing, payment_status: e.target.value })
                }
              >
                {[
                  ["pendente", "Pendente"],
                  ["parcial", "Parcial"],
                  ["pago", "Pago"],
                  ["reembolsado", "Reembolsado"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            Orçamento original:{" "}
            {editing.estimated_total == null
              ? "Preço sob consulta."
              : money(Number(editing.estimated_total))}
          </p>
          <details>
            <summary>Escolhas da solicitação</summary>
            <pre className="order-json">
              {JSON.stringify(editing.details, null, 2)}
            </pre>
          </details>
          <AuditTrail db={db} id={String(editing.id)} />
          <p className="hint">
            Só registre valores após conferir o recebimento. Alterar o status
            para confirmado não processa um pagamento.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Voltar à lista
            </button>
            <button className="button" disabled={busy}>
              Salvar pedido
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function AuditTrail({ db, id }: { db: SupabaseClient; id: string }) {
  const [events, setEvents] = useState<RecordRow[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    db.from("order_events")
      .select("created_at,changes")
      .eq("order_id", id)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) setError("Não foi possível carregar a auditoria.");
        else setEvents(data ?? []);
      });
  }, [db, id]);
  return (
    <details>
      <summary>Histórico de alterações</summary>
      {error && <p className="error">{error}</p>}
      {events.map((event, i) => (
        <article className="audit-event" key={i}>
          <strong>
            {new Date(String(event.created_at)).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
          </strong>
          <pre className="order-json">
            {JSON.stringify(event.changes, null, 2)}
          </pre>
        </article>
      ))}
    </details>
  );
}
