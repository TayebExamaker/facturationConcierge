import { NextResponse, type NextRequest } from "next/server";
import { parseInvoicePdf } from "@/lib/pdf/parse";

/**
 * Endpoint for the PWA Web Share Target API.
 *
 * Flow:
 *   1. User taps "Share" on a PDF in another app (WhatsApp, Mail, Files…).
 *   2. The OS share sheet lists "Concierge One Invoicing" thanks to the
 *      `share_target` entry in public/manifest.json.
 *   3. The OS POSTs the file here as multipart/form-data.
 *   4. We parse the PDF, encode the extracted fields in a URL param,
 *      and 303-redirect to /invoices/new so the form opens pre-filled.
 *
 * Platform support:
 *   - Android Chrome (PWA installed): full file sharing supported.
 *   - iOS Safari: NO share_target file support as of 2026 — the user can
 *     still open the installed PWA via Home Screen and pick the PDF via
 *     the in-form "Import PDF to fill" button.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function buildRedirect(request: NextRequest): Promise<NextResponse> {
  let payload: Record<string, unknown> | null = null;

  try {
    const fd = await request.formData();
    const file = fd.get("file") ?? fd.get("files");
    if (file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await parseInvoicePdf(buf);
      payload = {
        client_name: parsed.clientName,
        client_address: parsed.clientAddress,
        date: parsed.date,
        total: parsed.total,
        currency: parsed.currency,
      };
    }
  } catch {
    // Non-fatal — fall through with no payload; the form opens blank.
  }

  const target = new URL("/invoices/new", request.url);
  if (payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    target.searchParams.set("prefill", encoded);
  }

  // 303 = "see other" — converts the POST flow to a GET on the target.
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  return buildRedirect(request);
}

// Some OS share sheets do a GET ping before posting; respond gracefully.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/invoices/new", request.url));
}
