// HTTP layer of the MCP endpoint (Streamable HTTP, stateless JSON mode).
// Two entry points share it:
//   POST /api/mcp          key in `Authorization: Bearer` / `X-API-Key` (Claude Code, API clients)
//   POST /api/mcp/{key}    key in the URL path (claude.ai custom connectors, which can't send headers)

import { NextResponse } from "next/server";

import { checkKey, keyFromHeaders } from "@/lib/api/core";
import { handleMcpPayload } from "@/lib/mcp/server";

const HEADERS = { "Cache-Control": "no-store" };

function rpcError(status: number, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers: HEADERS },
  );
}

export async function mcpPost(req: Request, pathKey?: string): Promise<NextResponse> {
  const verdict = checkKey(pathKey ? decodeURIComponent(pathKey) : keyFromHeaders(req));
  if (verdict === "disabled") return rpcError(503, -32000, "MCP disabled: CRM_API_KEY is not set on the server.");
  if (verdict === "invalid") return rpcError(401, -32001, "Invalid or missing API key.");

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return rpcError(400, -32700, "Parse error");
  }
  const body = await handleMcpPayload(payload);
  if (body === null) return new NextResponse(null, { status: 202, headers: HEADERS });
  return NextResponse.json(body, { headers: HEADERS });
}

/** No server-initiated stream in stateless mode. */
export function mcpMethodNotAllowed(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { ...HEADERS, Allow: "POST" } });
}
