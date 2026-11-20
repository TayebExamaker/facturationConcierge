import {
  apiError,
  applyFilters,
  fetchAllDocuments,
  handler,
  json,
  parseListParams,
  preflight,
  toApiInvoice,
} from "@/lib/api/core";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export const GET = handler(async (req) => {
  const params = parseListParams(new URL(req.url));
  if (typeof params === "string") return apiError(400, "bad_request", params);

  const matched = applyFilters(await fetchAllDocuments(), params);
  const today = new Date();
  const page = matched.slice(params.offset, params.offset + params.limit);
  return json({
    data: page.map((inv) => toApiInvoice(inv, today)),
    pagination: {
      total: matched.length,
      limit: params.limit,
      offset: params.offset,
      has_more: params.offset + page.length < matched.length,
    },
  });
});
