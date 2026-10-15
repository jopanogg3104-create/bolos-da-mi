import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuote,
  calculateCatalogQuote,
  emptyCommerce,
  emptySchedule,
  validateSchedule,
  localSlotInstant,
} from "../lib/commerce";
import type { Option, Product } from "../lib/types";
const opts: Option[] = [
  ["size", "s", 80],
  ["batter", "b", 0],
  ["filling", "f", 12.1],
  ["decoration", "d", 20],
  ["extra", "e", 0.2],
].map(([kind, id, price]) => ({
  kind: String(kind),
  id: String(id),
  label: String(id),
  price: Number(price),
  portions: null,
  active: true,
}));
const selection = {
  size: "s",
  batter: "b",
  fillings: ["f"],
  decoration: "d",
  extras: ["e"],
  method: "Entrega" as const,
};
test("preço somente com regra ativada e todos os valores reais presentes", () => {
  assert.equal(calculateQuote(selection, opts, emptyCommerce).total, null);
  assert.equal(
    calculateQuote(selection, opts, {
      ...emptyCommerce,
      pricing_enabled: true,
      delivery_fee: 10,
    }).total,
    122.3,
  );
  assert.equal(
    calculateQuote(
      selection,
      opts.map((o) => (o.id === "b" ? { ...o, price: null } : o)),
      { ...emptyCommerce, pricing_enabled: true, delivery_fee: 10 },
    ).total,
    null,
  );
});
test("não usa opções inativas, repetidas ou combinação de recheios proibida", () => {
  const rules = { ...emptyCommerce, pricing_enabled: true, delivery_fee: 0 };
  assert.equal(
    calculateQuote(
      selection,
      opts.map((o) => (o.id === "s" ? { ...o, active: false } : o)),
      rules,
    ).total,
    null,
  );
  assert.equal(
    calculateQuote({ ...selection, fillings: ["f", "f"] }, opts, rules).total,
    null,
  );
  assert.equal(
    calculateQuote(selection, opts, {
      ...rules,
      fillings_incompatible: [["f"]],
    }).total,
    null,
  );
});
test("carrinho usa preço do catálogo e não aceita quantidades inválidas", () => {
  const products = [
    { id: "p", name: "Produto de teste", price: 0.1, active: true } as Product,
  ];
  assert.equal(
    calculateCatalogQuote(
      [{ id: "p", quantity: 3 }],
      products,
      "Retirada",
      null,
    ).total,
    0.3,
  );
  assert.equal(
    calculateCatalogQuote(
      [{ id: "p", quantity: -1 }],
      products,
      "Retirada",
      null,
    ).total,
    null,
  );
  assert.equal(
    calculateCatalogQuote(
      [{ id: "unknown", quantity: 1 }],
      products,
      "Retirada",
      null,
    ).total,
    null,
  );
});
test("agenda vazia não anuncia disponibilidade; abertura exige configuração válida", () => {
  assert.equal(validateSchedule(emptySchedule), null);
  assert.ok(validateSchedule({ ...emptySchedule, enabled: true }));
  assert.equal(
    validateSchedule({
      ...emptySchedule,
      enabled: true,
      daily_capacity: 3,
      weekdays: [1, 2],
      slots: [{ time: "09:00", method: "Retirada", capacity: 1 }],
    }),
    null,
  );
  assert.ok(
    validateSchedule({
      ...emptySchedule,
      slots: [{ time: "25:00", method: "Retirada", capacity: 1 }],
    }),
  );
});
test("horário de encomenda tem fuso de São Paulo", () => {
  assert.equal(
    localSlotInstant("2030-12-01", "09:00").toISOString(),
    "2030-12-01T12:00:00.000Z",
  );
});
