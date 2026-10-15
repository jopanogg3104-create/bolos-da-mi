import { test } from "node:test";
import assert from "node:assert/strict";
import { dateNotice, emptySimpleCake, simpleCakeMessage, validateSimpleCakeStep, validCakeDate } from "../lib/simple-cake";
import { whatsapp } from "../lib/order";
test("montagem simples valida escolhas e aceita data livre sem agenda", () => {
  for (let step = 0; step < 6; step++) assert.ok(validateSimpleCakeStep(step, emptySimpleCake));
  assert.equal(validateSimpleCakeStep(5, { ...emptySimpleCake, date: "2000-01-01" }), "");
  assert.equal(validCakeDate("2026-02-30"), false);
  assert.equal(validCakeDate("2028-02-29"), true);
  assert.equal(validCakeDate("2030-12-01"), true);
});
test("WhatsApp preserva escolhas e caracteres sem contato, endereço ou preço", () => {
  const cake = { ...emptySimpleCake, occasion: "Aniversário", size: "Tamanho cadastrado", batter: "Massa cadastrada", fillings: ["Recheio cadastrado"], style: "Estilo cadastrado", colors: "Rosa & branco", message: "Parabéns, vó! 🎂", date: "2030-12-01" };
  const text = simpleCakeMessage(cake);
  const url = new URL(whatsapp(text));
  assert.equal(url.host, "wa.me");
  assert.equal(url.pathname, "/5514991481627");
  assert.equal(url.searchParams.get("text"), text);
  for (const value of [cake.size, cake.batter, cake.fillings[0], cake.message, cake.colors, "01/12/2030", dateNotice]) assert.ok(text.includes(value));
  assert.match(text, /Sem detalhes adicionais/);
  assert.doesNotMatch(text, /Endereço:|CPF:|Horário:|Pix|R\$/);
});
