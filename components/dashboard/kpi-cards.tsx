import * as React from "react";
import {
  Coins,
  CircleDollarSign,
  Hourglass,
  Receipt,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/supabase/types";

export interface KpiCardsProps {
  invoices: Invoice[];
  /**
   * Display currency for aggregated KPIs. Defaults to USD; when invoices
   * contain mixed currencies a small "mixed currencies" hint is rendered.
   */
  displayCurrency?: string;
  className?: string;
}

function sumWhere(invoices: Invoice[], predicate: (i: Invoice) => boolean) {
  return invoices.reduce((acc, inv) => {
    if (!predicate(inv)) return acc;
    const total = Number((inv as { total?: number }).total ?? 0);
    return acc + (Number.isFinite(total) ? total : 0);
  }, 0);
}

export function KpiCards({
  invoices,
  displayCurrency = "USD",
  className,
}: KpiCardsProps) {
  const currencies = new Set(
    invoices
      .map((i) => (i as { currency?: string }).currency)
      .filter((c): c is string => typeof c === "string" && c.length > 0),
  );
  const mixed = currencies.size > 1;

  const totalInvoiced = sumWhere(invoices, () => true);
  const totalPaid = sumWhere(
    invoices,
    (i) => (i as { status?: string }).status === "paid",
  );
  const totalOutstanding = sumWhere(invoices, (i) => {
    const s = (i as { status?: string }).status;
    return s === "sent" || s === "overdue" || s === "draft";
  });
  const invoiceCount = invoices.length;

  const cards: ReadonlyArray<{
    label: string;
    value: string;
    icon: React.ReactNode;
    accent?: boolean;
  }> = [
    {
      label: "Total Invoiced",
      value: formatMoney(totalInvoiced, displayCurrency),
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: "Total Paid",
      value: formatMoney(totalPaid, displayCurrency),
      icon: <CircleDollarSign className="h-5 w-5" />,
      accent: true,
    },
    {
      label: "Total Outstanding",
      value: formatMoney(totalOutstanding, displayCurrency),
      icon: <Hourglass className="h-5 w-5" />,
    },
    {
      label: "Invoice Count",
      value: String(invoiceCount),
      icon: <Coins className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
        className,
      )}
    >
      {cards.map((card) => (
        <Card key={card.label} className="luxury-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {card.label}
              </span>
              <span
                className={cn(
                  "rounded-md p-2",
                  card.accent
                    ? "bg-gold/15 text-gold"
                    : "bg-secondary/60 text-muted-foreground",
                )}
              >
                {card.icon}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-serif text-3xl font-semibold",
                  card.accent && "text-gold",
                )}
              >
                {card.value}
              </span>
            </div>
            {mixed && card.label !== "Invoice Count" ? (
              <p
                className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/70"
                title="Totals shown in display currency; invoices include multiple currencies"
              >
                mixed currencies
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default KpiCards;
