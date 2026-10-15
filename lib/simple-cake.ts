import type { Cake } from "./types";
export type SimpleCake = Pick<Cake, "occasion" | "size" | "batter" | "fillings" | "style" | "colors" | "message" | "date" | "notes">;
export const emptySimpleCake: SimpleCake = { occasion: "", size: "", batter: "", fillings: [], style: "", colors: "", message: "", date: "", notes: "" };
export const dateNotice = "A data escolhida está sujeita à confirmação da confeiteira.";
export function validCakeDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
export function validateSimpleCakeStep(step: number, cake: SimpleCake) {
  if (step === 0 && !cake.occasion.trim()) return "Escolha a ocasião.";
  if (step === 1 && !cake.size.trim()) return "Escolha o tamanho ou peça ajuda à Mi.";
  if (step === 2 && !cake.batter.trim()) return "Escolha a massa ou peça ajuda à Mi.";
  if (step === 3 && !cake.fillings.length) return "Escolha um recheio ou peça ajuda à Mi.";
  if (step === 4 && !cake.style.trim()) return "Escolha a decoração ou peça ajuda à Mi.";
  if (step === 5 && !validCakeDate(cake.date)) return "Escolha uma data desejada válida.";
  return "";
}
export function simpleCakeMessage(cake: SimpleCake) {
  return [
    "Olá! Gostaria de encomendar um bolo da Bolos da Mi!", "",
    `Ocasião: ${cake.occasion}`, `Tamanho: ${cake.size}`, `Massa: ${cake.batter}`,
    `Recheio: ${cake.fillings.join(", ")}`, `Decoração: ${cake.style}`,
    `Cores: ${cake.colors.trim() || "A combinar com a Mi"}`,
    `Mensagem: ${cake.message.trim() || "Sem mensagem"}`,
    `Data desejada: ${cake.date.split("-").reverse().join("/")}`,
    `Observações: ${cake.notes.trim() || "Sem detalhes adicionais."}`, "",
    "Gostaria de saber o valor e confirmar a disponibilidade.", "Retirada em endereço combinado com a Mi (sem entrega).", dateNotice,
  ].join("\n");
}

// Preferências solicitadas pelo cliente; não representam estoque ou preço.
export const standardCakePreferences = {
  batter: ["Chocolate", "Baunilha", "Pão de ló"],
  filling: ["Brigadeiro", "Beijinho", "Doce de leite", "Leite em pó", "Morango"],
};
