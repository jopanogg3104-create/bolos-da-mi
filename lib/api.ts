import "server-only";
import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function serverDb(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new ApiError(
      503,
      "O serviço de encomendas ainda não está configurado. Converse com a Mi pelo WhatsApp.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : {}),
  });
}
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : url.protocol.slice(0, -1);
  // Next's internal request URL can use 0.0.0.0; browsers use the incoming Host.
  const expectedOrigin = `${protocol}://${host}`;
  if (origin && origin !== expectedOrigin)
    throw new ApiError(403, "Origem da solicitação inválida.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Envie dados no formato JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Solicitação vazia.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 20000) {
      await reader.cancel();
      throw new ApiError(413, "A solicitação excede o tamanho permitido.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Solicitação inválida.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(400, "Solicitação inválida.");
  return body;
}
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateInput(
  input: Record<string, unknown>,
  requireDate = false,
) {
  if (
    !["cake", "cart"].includes(String(input.kind)) ||
    !["Retirada", "Entrega"].includes(String(input.method))
  )
    throw new ApiError(400, "Revise o tipo de pedido e a modalidade.");
  if (
    requireDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date)) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time)))
  )
    throw new ApiError(400, "Escolha uma data e um horário disponíveis.");
  if (input.kind === "cart") {
    if (
      !Array.isArray(input.items) ||
      input.items.length < 1 ||
      input.items.length > 30 ||
      input.items.some(
        (i) =>
          !i ||
          !uuidPattern.test(i.id) ||
          !Number.isInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 99,
      )
    )
      throw new ApiError(400, "Revise os itens do carrinho.");
  } else {
    const s = input.selection as Record<string, unknown>;
    if (!s || typeof s !== "object" || Array.isArray(s))
      throw new ApiError(400, "Revise as opções do bolo.");
    for (const k of ["size", "batter", "decoration"])
      if (s[k] !== "" && !uuidPattern.test(String(s[k])))
        throw new ApiError(400, "Opção inválida.");
    for (const k of ["fillings", "extras"])
      if (
        !Array.isArray(s[k]) ||
        (s[k] as unknown[]).length > 30 ||
        (s[k] as unknown[]).some((v) => !uuidPattern.test(String(v)))
      )
        throw new ApiError(400, "Revise as combinações.");
  }
  const details = input.details as Record<string, unknown> | undefined;
  if (details) {
    if (typeof details !== "object" || Array.isArray(details))
      throw new ApiError(400, "Observações inválidas.");
    for (const [key, value] of Object.entries(details)) {
      if (
        ![
          "occasion",
          "size_preference",
          "batter_preference",
          "style_preference",
          "theme",
          "colors",
          "message",
          "reference",
          "notes",
          "address",
        ].includes(key) ||
        typeof value !== "string" ||
        value.length > (key === "notes" ? 1500 : 400)
      )
        throw new ApiError(400, "Revise as observações.");
    }
  }
  if (input.honeypot) throw new ApiError(400, "Solicitação inválida.");
}
const errorMessages: Record<string, [number, string]> = {
  RATE_LIMIT: [429, "Aguarde antes de enviar outra solicitação."],
  AUTH_REQUIRED: [
    401,
    "Não foi possível identificar sua sessão. Tente novamente.",
  ],
  INVALID_COMBINATION: [
    400,
    "Revise os recheios selecionados e seus limites de combinação.",
  ],
  DATE_FULL: [409, "Essa data acabou de ficar sem vagas. Escolha outra."],
  SLOT_FULL: [409, "Esse horário acabou de ficar sem vagas. Escolha outro."],
  DATE_UNAVAILABLE: [409, "Essa data não está disponível."],
  SLOT_UNAVAILABLE: [409, "Esse horário não está disponível."],
  NOTICE_REQUIRED: [409, "Essa data não respeita a antecedência mínima."],
  CATEGORY_FULL: [
    409,
    "A capacidade dessa categoria foi atingida para a data.",
  ],
  COMPLEXITY_FULL: [
    409,
    "A capacidade para este tipo de encomenda foi atingida.",
  ],
  OPTION_UNAVAILABLE: [409, "Uma opção do bolo não está mais disponível."],
  PRODUCT_UNAVAILABLE: [
    409,
    "Um produto do carrinho não está mais disponível.",
  ],
  ADDRESS_REQUIRED: [400, "Informe o endereço para a entrega."],
  DELIVERY_UNAVAILABLE: [400, "Entrega não está disponível."],
  ORDER_NOT_FOUND: [
    404,
    "Não encontramos um pedido com esse código de acesso.",
  ],
};
export function rpcError(message: string, code?: string) {
  const found = Object.entries(errorMessages).find(([key]) =>
    message.includes(key),
  );
  if (found) return new ApiError(...found[1]);
  if (code === "PGRST202" || code === "42P01")
    return new ApiError(
      503,
      "O serviço de encomendas precisa ser configurado. Converse com a Mi pelo WhatsApp.",
    );
  return new ApiError(
    400,
    "Não foi possível concluir. Confira suas escolhas e tente novamente.",
  );
}
export function errorResponse(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(
          503,
          "Não foi possível acessar o serviço agora. Tente novamente.",
        );
  return Response.json(
    { error: e.message },
    { status: e.status, headers: { "Cache-Control": "no-store" } },
  );
}
export function json(data: unknown) {
  return Response.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
