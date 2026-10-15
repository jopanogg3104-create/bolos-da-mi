import type { Cake, CartItem } from "./types";
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const whatsapp = (text: string) =>
  `https://wa.me/5514991481627?text=${encodeURIComponent(text)}`;
export function cakeMessage(c: Cake) {
  return [
    "Olá, Mi! Gostaria de solicitar um orçamento de bolo personalizado.",
    "",
    `Ocasião: ${c.occasion}`,
    `Tamanho: ${c.size || "A combinar"}`,
    `Massa: ${c.batter || "A combinar"}`,
    `Recheios: ${c.fillings.join(", ") || "A combinar"}`,
    `Adicionais: ${c.extras.join(", ") || "Nenhum"}`,
    `Estilo: ${c.style || "A combinar"}`,
    `Cores: ${c.colors || "A combinar"}`,
    `Tema: ${c.theme || "A combinar"}`,
    `Mensagem no bolo: ${c.message || "Sem mensagem"}`,
    `Referência: ${c.reference || "A combinar"}`,
    ...(c.image ? [`Imagem de referência: ${c.image}`] : []),
    `Data solicitada: ${c.date.split("-").reverse().join("/")}`,
    `Horário: ${c.time || "A combinar"}`,
    `Modalidade: ${c.method}`,
    ...(c.method === "Entrega" ? [`Endereço: ${c.address}`] : []),
    `Observações: ${c.notes || "Nenhuma"}`,
    "",
    "Solicitação de orçamento. Data, disponibilidade e valor sujeitos à confirmação pela confeiteira.",
  ].join("\n");
}
export function cartMessage(items: CartItem[], notes: string) {
  return [
    "Olá, Mi! Gostaria de solicitar um orçamento.",
    "",
    ...items.map(
      (i) =>
        `${i.quantity} × ${i.name}${i.price === null ? " — valor a consultar" : ` — ${money(i.price * i.quantity)}`}${i.detail ? `\n${i.detail}` : ""}`,
    ),
    `\nObservações: ${notes || "Nenhuma"}`,
    "\nValores e disponibilidade sujeitos à confirmação.",
  ].join("\n");
}
export function cartTotals(items: CartItem[]) {
  return {
    known: items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
    hasUnknown: items.some((i) => i.price === null),
  };
}
export function validateStep(step: number, c: Cake) {
  if (step === 0 && !c.occasion) return "Escolha a ocasião.";
  if (
    step === 5 &&
    (!c.date ||
      c.date <
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()))
  )
    return "Escolha uma data a partir de hoje.";
  if (step === 6 && c.method === "Entrega" && c.address.trim().length < 8)
    return "Informe o endereço para a entrega.";
  return "";
}
