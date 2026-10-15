import {
  ApiError,
  errorResponse,
  json,
  readBody,
  rpcError,
  serverDb,
  uuidPattern,
  validateInput,
} from "@/lib/api";
export async function POST(request: Request) {
  try {
    const body = await readBody(request),
      input = body.input as Record<string, unknown>;
    if (!input || typeof input !== "object")
      throw new ApiError(400, "Solicitação inválida.");
    validateInput(input, true);
    if (
      !uuidPattern.test(String(body.request_id)) ||
      !/^[a-f0-9]{64}$/.test(String(body.access_token))
    )
      throw new ApiError(400, "Identificação inválida.");
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) throw new ApiError(401, "Sua sessão precisa ser iniciada.");
    const db = serverDb(token);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      throw new ApiError(401, "Sua sessão expirou. Tente novamente.");
    const { data, error } = await db.rpc("submit_order", {
      p_input: input,
      p_request_id: body.request_id,
      p_access_token: body.access_token,
    });
    if (error) throw rpcError(error.message, error.code);
    return json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
