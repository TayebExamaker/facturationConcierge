import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { LoadError, PageHeader } from "@/components/layout/page-header";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import { Avatar, Stagger, StaggerItem } from "@/components/motion/primitives";
import { FitText } from "@/components/ui/fit-text";
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

  if (loadError || !profile) {
    return (
      <PageShell>
        <PageHeader back={{ href: "/clients", label: "Clients" }} title="Client" />
        <LoadError message={loadError ?? "Client not found"} />
      </PageShell>
    );
  }

  const { summary, invoices } = profile;
  const newHref = prefillHref(summary.name, summary.address, summary.currency);

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        eyebrow={
          summary.firstDate ? `Client since ${formatDate(summary.firstDate)}` : "Client"
        }
        title={
          <span className="flex items-center gap-4">
            <Avatar name={summary.name} size={52} className="hidden sm:inline-flex" />
            {summary.name}
          </span>
        }
        description={
          summary.address ? (
            <span className="flex items-start gap-1.5 whitespace-pre-line">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {summary.address}
            </span>
          ) : undefined
        }
        actions={
          <Button asChild variant="gold" size="lg" className="w-full md:w-auto">
            <Link href={newHref}>
              <Plus />
              New invoice
            </Link>
          </Button>
        }
      />

      {/* Per-currency billing summary */}
      <Stagger step={0.06} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.totals.map((t) => {
          const paidRatio = t.billed > 0 ? Math.min(1, t.paid / t.billed) : 0;
          return (
            <StaggerItem key={t.currency} className="luxury-card p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{t.currency}</span>
                <span className="text-xs text-muted-foreground">
                  {t.count} invoice{t.count > 1 ? "s" : ""}
                </span>
              </div>
              <FitText
                text={formatMoney(t.billed, t.currency)}
                className="mt-3 text-2xl font-semibold leading-tight tracking-tight tabular-nums"
              />
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${paidRatio * 100}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <span className="text-emerald-600">{formatMoney(t.paid, t.currency)} paid</span>
                {t.outstanding > 0 ? (
                  <span className="font-medium text-amber-600">
                    {formatMoney(t.outstanding, t.currency)} due
                  </span>
                ) : (
                  <span className="text-muted-foreground">Settled</span>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Invoices</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{invoices.length}</span>
      </div>
      <InvoiceTable invoices={invoices} />
    </PageShell>
  );
}
