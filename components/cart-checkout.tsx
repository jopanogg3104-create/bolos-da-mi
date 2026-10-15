"use client";
import { useState } from "react";
import type { CartItem, Data } from "@/lib/types";
import { cartMessage } from "@/lib/order";
import { AvailabilityPicker } from "./availability";
import { Checkout, type OrderInput } from "./order-checkout";
import type { Method } from "@/lib/commerce";
export function CartCheckout({
  items,
  notes,
  data,
}: {
  items: CartItem[];
  notes: string;
  data: Data;
}) {
  const [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [method, setMethod] = useState<Method>("Retirada"),
    [address, setAddress] = useState(""),
    [enabled, setEnabled] = useState(false);
  const input: OrderInput = {
    kind: "cart",
    method,
    date,
    time,
    items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
    details: { notes, address: method === "Entrega" ? address : "" },
  };
  return (
    <div className="form-grid">
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
          {data.settings.delivery && <option>Entrega</option>}
        </select>
      </label>
      {method === "Entrega" && (
        <label>
          Endereço de entrega
          <input
            maxLength={400}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
      )}
      <AvailabilityPicker
        date={date}
        time={time}
        method={method}
        onChange={(date, time) => {
          setDate(date);
          setTime(time);
        }}
        onState={setEnabled}
      />
      {enabled && (!date || !time) && (
        <p className="hint">
          Escolha uma data e um horário para registrar a solicitação.
        </p>
      )}
      <Checkout
        input={input}
        canRegister={
          enabled &&
          !!date &&
          !!time &&
          (method !== "Entrega" || address.trim().length >= 8)
        }
        message={`${cartMessage(items, notes)}\nData solicitada: ${date || "A combinar"}\nHorário: ${time || "A combinar"}\nModalidade: ${method}${method === "Entrega" ? `\nEndereço: ${address}` : ""}`}
      />
    </div>
  );
}
