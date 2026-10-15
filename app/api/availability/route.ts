import { ApiError, errorResponse, json, serverDb, rpcError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new ApiError(400, "Escolha um mês válido.");
    const { data, error } = await serverDb().rpc("availability_window", {
      p_start: month + "-01",
      p_days: new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate(),
    });
    if (error) throw rpcError(error.message, error.code);
    return json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
