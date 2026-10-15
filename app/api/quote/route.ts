import {
  errorResponse,
  json,
  readBody,
  serverDb,
  validateInput,
  rpcError,
} from "@/lib/api";
export async function POST(request: Request) {
  try {
    const input = await readBody(request);
    validateInput(input);
    const { data, error } = await serverDb().rpc("quote_order", {
      p_input: input,
    });
    if (error) throw rpcError(error.message, error.code);
    return json({ total: data.total, lines: data.lines, reason: data.reason });
  } catch (error) {
    return errorResponse(error);
  }
}
