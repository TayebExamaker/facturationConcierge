import { json, preflight } from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Public index — no data, just the map of endpoints. */
export function GET() {
  return json({
    name: "Concierge One Invoicing API",
    version: "v1",
    auth: "Header `Authorization: Bearer <CRM_API_KEY>` (or `X-API-Key`)",
    read_only: true,
    endpoints: {
      "GET /api/v1/summary": "Totals per currency: invoiced, paid, unpaid, overdue",
      "GET /api/v1/invoices": "List. Filters: status, unpaid, currency, client, from, to, type, limit, offset",
      "GET /api/v1/invoices/{id|number}": "One invoice (UUID or invoice number)",
      "GET /api/v1/unpaid": "Unpaid invoices (status ≠ paid), oldest first, with totals per currency",
      "GET /api/v1/clients": "Client directory with totals per currency",
      "GET /api/v1/clients/{name}": "One client + all their invoices",
    },
  });
}
