"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LogOut, Plus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { SPRING_LAYOUT } from "@/components/motion/primitives";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

/** Desktop (lg+) navigation rail. */
export function AppSidebar() {
  const pathname = usePathname();
  // "New Invoice" is promoted to the CTA button, not repeated in the list.
  const items = NAV_ITEMS.filter((i) => i.href !== "/invoices/new");

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border/70 bg-card/80 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link
        href="/dashboard"
        className="mb-8 flex items-center px-2"
        aria-label="Concierge One — Dashboard"
      >
        <Logo size={38} withWordmark className="[&_span:first-child]:text-[15px]" />
      </Link>

      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
        <Link
          href="/invoices/new"
          className={cn(
            "group flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background",
            "shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition-shadow hover:shadow-[0_14px_30px_-12px_rgba(15,23,42,0.85)]",
          )}
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          New Invoice
        </Link>
      </motion.div>

      <p className="eyebrow mb-2 mt-8 px-3">Menu</p>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {items.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "text-background" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active"
                  transition={SPRING_LAYOUT}
                  className="absolute inset-0 rounded-xl bg-foreground shadow-[0_8px_20px_-12px_rgba(15,23,42,0.8)]"
                />
              ) : null}
              <Icon className="relative h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Sign out
          </button>
        </form>
        <p className="px-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
          Concierge One Group Ltd
        </p>
      </div>
    </aside>
  );
}

export default AppSidebar;
