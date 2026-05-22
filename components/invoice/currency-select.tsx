"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CURRENCIES, type Currency } from "@/lib/currencies";

export interface CurrencySelectProps {
  value?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CurrencySelect({
  value,
  onChange,
  disabled,
  className,
  id,
}: CurrencySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected: Currency | undefined = React.useMemo(
    () => CURRENCIES.find((c) => c.code === value),
    [value],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.symbol ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider">
                {selected.code}
              </span>
              <span className="text-muted-foreground">— {selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select currency…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border/40">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search currency…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No currencies match
            </div>
          ) : (
            filtered.map((c) => {
              const active = c.code === value;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange?.(c.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-sm text-sm hover:bg-secondary/60 text-left",
                    active && "bg-gold/10 text-gold",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wider w-10">
                      {c.code}
                    </span>
                    <span>{c.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {c.symbol ? <span className="text-xs">{c.symbol}</span> : null}
                    {active ? <Check className="h-4 w-4" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CurrencySelect;
