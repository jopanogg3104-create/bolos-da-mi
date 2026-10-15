"use client";
import { useState } from "react";
import Link from "next/link";
import type { Method } from "@/lib/commerce";
import { AvailabilityPicker } from "./availability";
export function AgendaPanel({ delivery }: { delivery: boolean }) {
  const [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [method, setMethod] = useState<Method>("Retirada");
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">PLANEJE SUA CELEBRAÇÃO</span>
          <h1>Agenda de disponibilidade</h1>
        </div>
        <p>
          Consulte datas e horários. A escolha do horário não confirma
          automaticamente uma encomenda.
        </p>
      </div>
      <label>
        Modalidade
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as Method);
            setTime("");
          }}
        >
          <option>Retirada</option>
          {delivery && <option>Entrega</option>}
        </select>
      </label>
      <AvailabilityPicker
        date={date}
        time={time}
        method={method}
        onChange={(date, time) => {
          setDate(date);
          setTime(time);
        }}
        standalone
      />
      <Link
        className="button agenda-link"
        href={`/monte-seu-bolo${date && time ? `?data=${date}&hora=${time}&modalidade=${method}` : ""}`}
      >
        Personalizar e escolher um horário →
      </Link>
    </section>
  );
}
