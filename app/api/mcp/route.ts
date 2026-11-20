import { mcpMethodNotAllowed, mcpPost } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => mcpPost(req);
export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;
