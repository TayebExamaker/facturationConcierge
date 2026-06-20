"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Users, FileText, ChevronRight } from "lucide-react";

import ClientOnly from "@/components/client-only";
import { Input } from "@/components/ui/input";
import { formatMoney, formatDate } from "@/lib/format";
import { clientKey, type ClientSummary } from "@/lib/clients";

const islandSkeleton = (
  <div className="space-y-4">
    <div className="luxury-card h-12 animate-pulse bg-muted/10" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="luxury-card h-32 animate-pulse bg-muted/10" />
      ))}
    </div>
  </div>
);

export function ClientsIsland({ clients }: { clients: ClientSummary[] }) {
  return (
    <ClientOnly fallback={islandSkeleton}>
      <ClientsInner clients={clients} />
    </ClientOnly>
  );
}

function ClientsInner({ clients }: { clients: ClientSummary[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Rechercher un client par nom ou adresse…"
          className="pl-9 h-11"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search clients"
        />
      </div>

      {clients.length === 0 ? (
        <div className="luxury-card p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-serif text-xl">No clients yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Clients appear here automatically once you create invoices for them.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="luxury-card p-10 text-center text-sm text-muted-foreground">
          No client matches “{query}”.
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {filtered.length} client{filtered.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <ClientCard key={c.key} client={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ClientCard({ client }: { client: ClientSummary }) {
  const href = `/clients/${encodeURIComponent(clientKey(client.name))}`;
  return (
    <Link
      href={href}
      className="luxury-card group flex flex-col gap-3 p-4 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-tight truncate">{client.name}</p>
          {client.address ? (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
              {client.address}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground italic">
              No address on file
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {client.invoiceCount} invoice{client.invoiceCount > 1 ? "s" : ""}
        </span>
        {client.lastDate ? (
          <span>Last: {formatDate(client.lastDate)}</span>
        ) : null}
      </div>

      {client.totals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
          {client.totals.map((t) => (
            <span
              key={t.currency}
              className="rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] tabular-nums"
              title={`${formatMoney(t.paid, t.currency)} paid · ${formatMoney(
                t.outstanding,
                t.currency,
              )} outstanding`}
            >
              {formatMoney(t.billed, t.currency)}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export default ClientsIsland;
