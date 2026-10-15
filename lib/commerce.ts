import type { Option, Product } from "./types";
export const orderStatuses = [
  ["recebido", "Solicitação recebida"],
  ["aguardando_aprovacao", "Aguardando aprovação"],
  ["orcamento_enviado", "Orçamento enviado"],
  ["aguardando_pagamento", "Aguardando pagamento"],
  ["confirmado", "Confirmado"],
  ["em_producao", "Em produção"],
  ["pronto", "Pronto para retirada"],
  ["saiu_entrega", "Saiu para entrega"],
  ["concluido", "Concluído"],
  ["cancelado", "Cancelado"],
] as const;
export type OrderStatus = (typeof orderStatuses)[number][0];
export const statusLabel = (status: string) =>
  orderStatuses.find((s) => s[0] === status)?.[1] ?? status;
export type Method = "Retirada" | "Entrega";
export type TimeSlot = { time: string; method: Method; capacity: number };
export type ScheduleConfig = {
  enabled: boolean;
  daily_capacity: number;
  notice_hours: number;
  weekdays: number[];
  slots: TimeSlot[];
  category_limits: Record<string, number>;
  complexity_capacity: number | null;
};
export const emptySchedule: ScheduleConfig = {
  enabled: false,
  daily_capacity: 0,
  notice_hours: 0,
  weekdays: [],
  slots: [],
  category_limits: {},
  complexity_capacity: null,
};
export type CommerceConfig = {
  id: "main";
  schedule: ScheduleConfig;
  pricing_enabled: boolean;
  delivery_fee: number | null;
  pix_key: string;
  deposit_percent: number | null;
  fillings_incompatible: string[][];
  pending_hold_hours: number;
};
export const emptyCommerce: CommerceConfig = {
  id: "main",
  schedule: emptySchedule,
  pricing_enabled: false,
  delivery_fee: null,
  pix_key: "",
  deposit_percent: null,
  fillings_incompatible: [],
  pending_hold_hours: 24,
};
export type AvailableDay = {
  date: string;
  available: boolean;
  remaining: number;
  pending: number;
  confirmed: number;
  slots: TimeSlot[];
};
export type Availability = {
  enabled: boolean;
  days: AvailableDay[];
  notice_hours: number;
};
export type QuoteSelection = {
  size: string;
  batter: string;
  fillings: string[];
  decoration: string;
  extras: string[];
  method: Method;
};
export type QuoteResult = {
  total: number | null;
  lines: { label: string; amount: number | null }[];
  reason: string | null;
};
const cents = (value: number | null) =>
  value === null ? null : Math.round(value * 100);
/** Explicit rule: size base + selected option surcharges + delivery, only when enabled. */
export function calculateQuote(
  selection: QuoteSelection,
  options: Option[],
  rules: Pick<
    CommerceConfig,
    "pricing_enabled" | "delivery_fee" | "fillings_incompatible"
  >,
): QuoteResult {
  if (!rules.pricing_enabled)
    return { total: null, lines: [], reason: "Preço sob consulta." };
  if (
    new Set(selection.fillings).size !== selection.fillings.length ||
    new Set(selection.extras).size !== selection.extras.length
  )
    return { total: null, lines: [], reason: "Há opções repetidas." };
  if (
    rules.fillings_incompatible.some((pair) =>
      pair.every((id) => selection.fillings.includes(id)),
    )
  )
    return {
      total: null,
      lines: [],
      reason: "Esta combinação de recheios não está disponível.",
    };
  const choices: [string, string][] = [
    [selection.size, "size"],
    [selection.batter, "batter"],
    ...selection.fillings.map((id) => [id, "filling"] as [string, string]),
    [selection.decoration, "decoration"],
    ...selection.extras.map((id) => [id, "extra"] as [string, string]),
  ];
  const lines = choices.map(([id, kind]) => {
    const option = options.find(
      (o) => o.id === id && o.kind === kind && o.active,
    );
    return {
      label: option?.label ?? "Opção a combinar",
      amount: option?.price ?? null,
    };
  });
  if (selection.method === "Entrega")
    lines.push({ label: "Entrega", amount: rules.delivery_fee });
  const complete =
    !!selection.size &&
    !!selection.batter &&
    !!selection.decoration &&
    selection.fillings.length > 0 &&
    lines.every(
      (l) => l.amount !== null && Number.isFinite(l.amount) && l.amount! >= 0,
    );
  return {
    total: complete
      ? lines.reduce((sum, l) => sum + cents(l.amount)!, 0) / 100
      : null,
    lines,
    reason: complete ? null : "Preço sob consulta.",
  };
}
export function calculateCatalogQuote(
  items: { id: string; quantity: number }[],
  products: Product[],
  method: Method,
  deliveryFee: number | null,
): QuoteResult {
  if (
    !items.length ||
    new Set(items.map((i) => i.id)).size !== items.length ||
    items.some(
      (i) => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99,
    )
  )
    return { total: null, lines: [], reason: "Revise os itens do carrinho." };
  const lines = items.map((item) => {
    const p = products.find((p) => p.id === item.id && p.active);
    return {
      label: p ? `${item.quantity} × ${p.name}` : "Produto indisponível",
      amount: p?.price == null ? null : (cents(p.price)! * item.quantity) / 100,
    };
  });
  if (method === "Entrega")
    lines.push({ label: "Entrega", amount: deliveryFee });
  const complete = lines.every((l) => l.amount !== null);
  return {
    total: complete
      ? lines.reduce((sum, l) => sum + cents(l.amount)!, 0) / 100
      : null,
    lines,
    reason: complete ? null : "Preço sob consulta.",
  };
}
export function brazilDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function localSlotInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}
export function validateSchedule(config: ScheduleConfig): string | null {
  if (
    !Number.isInteger(config.daily_capacity) ||
    config.daily_capacity < 0 ||
    config.daily_capacity > 1000
  )
    return "Informe uma capacidade diária de 0 a 1000.";
  if (
    !Number.isFinite(config.notice_hours) ||
    config.notice_hours < 0 ||
    config.notice_hours > 8760
  )
    return "Revise a antecedência mínima.";
  if (
    !Array.isArray(config.weekdays) ||
    config.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    return "Revise os dias de atendimento.";
  if (
    config.complexity_capacity !== null &&
    (!Number.isInteger(config.complexity_capacity) ||
      config.complexity_capacity < 1)
  )
    return "Revise a capacidade por complexidade.";
  if (
    Object.values(config.category_limits).some(
      (v) => !Number.isInteger(v) || v < 0,
    )
  )
    return "Revise os limites por categoria.";
  const keys = new Set<string>();
  for (const slot of config.slots) {
    const key = slot.method + slot.time;
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time) ||
      !["Retirada", "Entrega"].includes(slot.method) ||
      !Number.isInteger(slot.capacity) ||
      slot.capacity < 1 ||
      slot.capacity > 1000 ||
      keys.has(key)
    )
      return "Revise horários, modalidades e capacidades; não repita horários na mesma modalidade.";
    keys.add(key);
  }
  if (
    config.enabled &&
    (!config.weekdays.length || !config.slots.length || !config.daily_capacity)
  )
    return "Cadastre dias, horários e capacidade antes de abrir a agenda.";
  return null;
}
