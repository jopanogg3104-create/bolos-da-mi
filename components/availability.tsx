"use client";
import { useEffect, useState } from "react";
import type { Availability, Method } from "@/lib/commerce";
import { brazilDate } from "@/lib/commerce";
export function AvailabilityPicker({
  date,
  time,
  method,
  onChange,
  onState,
  standalone = false,
}: {
  date: string;
  time: string;
  method: Method;
  onChange: (date: string, time: string) => void;
  onState?: (enabled: boolean) => void;
  standalone?: boolean;
}) {
  const today = brazilDate();
  const [month, setMonth] = useState(date?.slice(0, 7) || today.slice(0, 7)),
    [data, setData] = useState<Availability | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    fetch(`/api/availability?month=${month}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setData(json);
        onState?.(json.enabled);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          onState?.(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, retry]);
  const selected = data?.days.find((d) => d.date === date);
  const slots = selected?.slots.filter((s) => s.method === method) ?? [];
  return (
    <div className="availability">
      <div className="calendar-toolbar">
        <label>
          Mês de atendimento
          <input
            type="month"
            min={today.slice(0, 7)}
            max={String(Number(today.slice(0, 4)) + 1) + today.slice(4, 7)}
            value={month}
            onChange={(e) => {
              if (/^\d{4}-\d{2}$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="text-link"
          disabled={loading}
          onClick={() => setRetry((r) => r + 1)}
        >
          Atualizar agenda
        </button>
      </div>
      {loading && <p role="status">Consultando a disponibilidade…</p>}
      {error && (
        <p className="hint" role="status">
          A agenda online ainda não está disponível. Consulte datas e horários
          diretamente com a Mi pelo WhatsApp.
        </p>
      )}
      {data && !data.enabled && (
        <p className="hint">
          A agenda online ainda não está aberta. A Mi pode orientar você pelo
          WhatsApp.
        </p>
      )}
      {data?.enabled && (
        <>
          <p className="hint">
            Antecedência mínima: {data.notice_hours} hora(s). A escolha do
            horário é uma solicitação, sujeita à confirmação.
          </p>
          <div className="calendar-grid" role="group" aria-label="Datas do mês">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <span className="calendar-weekday" key={label}>
                {label}
              </span>
            ))}
            {Array.from(
              { length: new Date(`${month}-01T12:00:00Z`).getUTCDay() },
              (_, i) => (
                <span key={`blank-${i}`} aria-hidden="true" />
              ),
            )}
            {data.days.map((day) => {
              const available =
                day.available && day.slots.some((s) => s.method === method);
              return (
                <button
                  type="button"
                  className={`calendar-day ${day.date === date ? "selected" : ""}`}
                  key={day.date}
                  disabled={!available}
                  aria-pressed={day.date === date}
                  aria-label={`${day.date.split("-").reverse().join("/")} — ${available ? `${day.remaining} vagas disponíveis` : "Indisponível"}`}
                  onClick={() => onChange(day.date, "")}
                >
                  <strong>{Number(day.date.slice(-2))}</strong>
                  <small>
                    {available ? `${day.remaining} vaga(s)` : "Sem vagas"}
                  </small>
                </button>
              );
            })}
          </div>
          {date && (
            <fieldset>
              <legend>
                Horários para {method.toLowerCase()} em{" "}
                {date.split("-").reverse().join("/")}
              </legend>
              <div className="choices">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={`choice ${time === slot.time ? "selected" : ""}`}
                    aria-pressed={time === slot.time}
                    onClick={() => onChange(date, slot.time)}
                  >
                    {slot.time}
                    <small>{slot.capacity} vaga(s)</small>
                  </button>
                ))}
              </div>
              {!slots.length && (
                <p>
                  Não há horários disponíveis para esta modalidade na data
                  selecionada.
                </p>
              )}
            </fieldset>
          )}
        </>
      )}
      {!loading && !data?.enabled && !standalone && (
        <div className="form-grid">
          <label>
            Data desejada (a consultar)
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => onChange(e.target.value, time)}
            />
          </label>
          <label>
            Horário desejado (a consultar)
            <input
              type="time"
              value={time}
              onChange={(e) => onChange(date, e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
