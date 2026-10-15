import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cakeMessage,
  cartMessage,
  cartTotals,
  validateStep,
  whatsapp,
} from "../lib/order";
import { emptyCake } from "../lib/types";
test("referência e escolhas acompanham orçamento sem confirmação automática", () => {
  const c = {
    ...emptyCake,
    occasion: "Aniversário",
    reference: "Criação 1 [video-original]",
    date: "2030-12-01",
    fillings: ["Recheio cadastrado"],
  };
  const text = cakeMessage(c);
  assert.match(text, /Criação 1 \[video-original\]/);
  assert.match(text, /01\/12\/2030/);
  assert.match(text, /Recheio cadastrado/);
  assert.match(text, /sujeitos à confirmação/);
  assert.equal(new URL(whatsapp(text)).searchParams.get("text"), text);
});
test("subtotal não atribui preço a produto sem valor cadastrado", () => {
  const items = [
    { id: "1", name: "Bolo real", price: 80, quantity: 2, detail: "" },
    { id: "2", name: "Sob consulta", price: null, quantity: 1, detail: "" },
  ];
  assert.deepEqual(cartTotals(items), { known: 160, hasUnknown: true });
  assert.match(cartMessage(items, "Retirada"), /valor a consultar/);
  assert.match(cartMessage(items, "Retirada"), /Retirada/);
});
test("validação exige ocasião, data e endereço quando houver entrega", () => {
  assert.ok(validateStep(0, emptyCake));
  assert.ok(validateStep(5, { ...emptyCake, date: "2000-01-01" }));
  assert.ok(validateStep(6, { ...emptyCake, method: "Entrega", address: "" }));
  assert.equal(validateStep(6, { ...emptyCake, method: "Retirada" }), "");
  assert.doesNotMatch(cakeMessage(emptyCake), /Nome:|WhatsApp:/);
});
