"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileText, Loader2, Search, Users, X } from "lucide-react";

import ClientOnly from "@/components/client-only";
import { Input } from "@/components/ui/input";
import { Avatar, EASE_OUT, SPRING_LAYOUT } from "@/components/motion/primitives";
import { formatMoney, formatDate } from "@/lib/format";
import { clientKey, type ClientSummary } from "@/lib/clients";

// Cards mount in pages so hundreds of clients don't animate in at once.
const PAGE_SIZE = 36;

const islandSkeleton = (
  <div className="space-y-4">
    <div className="h-11 max-w-md animate-pulse rounded-xl bg-secondary" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="luxury-card h-36 animate-pulse" />
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

  const [limit, setLimit] = React.useState(PAGE_SIZE);
  React.useEffect(() => setLimit(PAGE_SIZE), [query]);
  const visible = filtered.slice(0, limit);
  const loadMore = React.useCallback(() => setLimit((l) => l + PAGE_SIZE), []);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const hasMore = filtered.length > limit;
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, limit]);

  return (
    <div className="space-y-5">
      {/* Sticks under the mobile top bar so search is always one tap away. */}
      <div className="sticky top-[calc(var(--safe-top)+3.5rem)] z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or address"
            className="pl-10 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clients"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="No clients yet"
          body="Clients appear here automatically once you create invoices for them."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6 text-muted-foreground" />}
          title="No match"
          body={`No client matches “${query}”.`}
        />
      ) : (
        <>
          <p className="eyebrow px-1">
            {filtered.length} client{filtered.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((c, i) => (
                <motion.div
                  key={c.key}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    ...SPRING_LAYOUT,
                    opacity: { duration: 0.3, delay: Math.min(i % PAGE_SIZE, 9) * 0.04 },
                  }}
                >
                  <ClientCard client={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <button
                type="button"
                onClick={loadMore}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading more…
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="luxury-card flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        {icon}
      </div>
      <p className="mt-4 text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function ClientCard({ client }: { client: ClientSummary }) {
  const href = `/clients/${encodeURIComponent(clientKey(client.name))}`;
  const due = client.totals.find((t) => t.outstanding > 0);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="h-full"
    >
      <Link
        href={href}
        className="luxury-card group flex h-full flex-col gap-4 p-4 transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)]"
      >
        <div className="flex items-start gap-3">
          <Avatar name={client.name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{client.name}</p>
            {client.address ? (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                {client.address}
              </p>
            ) : (
              <p className="mt-0.5 text-xs italic text-muted-foreground">No address on file</p>
            )}
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-auto space-y-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            {client.totals.slice(0, 2).map((t) => (
              <span
                key={t.currency}
                className="whitespace-nowrap text-[15px] font-semibold tabular-nums"
                title={`${formatMoney(t.paid, t.currency)} paid · ${formatMoney(t.outstanding, t.currency)} outstanding`}
              >
                {formatMoney(t.billed, t.currency)}
              </span>
            ))}
            {client.totals.length > 2 ? (
              <span className="text-[11px] text-muted-foreground">
                +{client.totals.length - 2} more
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1">
              <FileText className="h-3 w-3" />
              {client.invoiceCount} invoice{client.invoiceCount > 1 ? "s" : ""}
            </span>
            {due ? (
              <span className="truncate font-medium text-amber-600">
                {formatMoney(due.outstanding, due.currency)} due
              </span>
            ) : client.lastDate ? (
              <span className="truncate">Last {formatDate(client.lastDate)}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ClientsIsland;
