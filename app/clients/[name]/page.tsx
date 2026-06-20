import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import { getClientProfile } from "@/app/actions/clients";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { name: string };
}

/**
 * Build the `?prefill=` payload consumed by /invoices/new so a fresh invoice
 * opens with this client's name, address and last currency already filled —
 * same base64url-JSON contract used by the share-target route.
 */
function prefillHref(client_name: string, client_address: string | null, currency: string): string {
  const payload = JSON.stringify({
    client_name,
    client_address: client_address ?? "",
    currency,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `/invoices/new?prefill=${encoded}`;
}

export default async function ClientProfilePage({ params }: PageProps) {
  // Next.js already URL-decodes route params; decode again only if it's still
  // percent-encoded, and never throw on a stray "%" in a client name.
  const raw = params.name ?? "";
  let key = raw;
  if (/%[0-9a-f]{2}/i.test(raw)) {
    try {
      key = decodeURIComponent(raw);
    } catch {
      key = raw;
    }
  }

  let profile: Awaited<ReturnType<typeof getClientProfile>> = null;
  let loadError: string | null = null;
  try {
    profile = await getClientProfile(key);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load client";
  }

  if (!loadError && !profile) notFound();

  return (
    <PageShell>
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      {loadError ? (
        <div className="luxury-card p-4 border-destructive/40 text-sm text-destructive mt-4">
          {loadError}
        </div>
      ) : profile ? (
        <>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-gold">
                Client
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl mt-1 break-words">
                {profile.summary.name}
              </h1>
              {profile.summary.address ? (
                <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground whitespace-pre-line">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {profile.summary.address}
                </p>
              ) : null}
            </div>
            <Button asChild variant="gold" className="h-11 sm:h-9 shrink-0">
              <Link
                href={prefillHref(
                  profile.summary.name,
                  profile.summary.address,
                  profile.summary.currency,
                )}
              >
                <Plus className="h-4 w-4" />
                New invoice
              </Link>
            </Button>
          </div>

          <div className="gold-divider my-6" aria-hidden="true" />

          {/* Per-currency billing summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {profile.summary.totals.map((t) => (
              <div key={t.currency} className="luxury-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t.currency}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.count} invoice{t.count > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatMoney(t.billed, t.currency)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-emerald-600">
                    {formatMoney(t.paid, t.currency)} paid
                  </span>
                  {t.outstanding > 0 ? (
                    <span className="text-amber-600">
                      {formatMoney(t.outstanding, t.currency)} due
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Settled</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Invoices</h2>
            <span className="text-sm text-muted-foreground">
              {profile.summary.firstDate
                ? `Since ${formatDate(profile.summary.firstDate)}`
                : null}
            </span>
          </div>
          <InvoiceTable invoices={profile.invoices} />
        </>
      ) : null}
    </PageShell>
  );
}
