import { mcpMethodNotAllowed, mcpPost } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

/** Secret-in-path variant for claude.ai custom connectors (no header support). */
export const POST = (req: Request, { params }: { params: { key: string } }) =>
  mcpPost(req, params.key);
export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;
