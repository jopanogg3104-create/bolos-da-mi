import {
  ApiError,
  errorResponse,
  json,
  readBody,
  rpcError,
  serverDb,
} from "@/lib/api";
export async function POST(request: Request) {
  try {
    const { token } = await readBody(request);
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new ApiError(
        404,
        "Não encontramos um pedido com esse código de acesso.",
      );
    const { data, error } = await serverDb().rpc("lookup_order", {
      p_token: token,
    });
    if (error) throw rpcError(error.message, error.code);
    return json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
