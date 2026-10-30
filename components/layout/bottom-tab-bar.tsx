"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus } from "lucide-react";

import { SPRING_LAYOUT, SPRING_PANEL } from "@/components/motion/primitives";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

/**
 * Floating mobile tab bar (inspired by 21st.dev "Bottom Nav Bar"). The active
 * tab gets a pill that glides between items via a shared `layoutId`; the
 * centre slot is a raised ink "New invoice" button.
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <motion.nav
      aria-label="Main"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={SPRING_PANEL}
      className="no-print fixed inset-x-3 bottom-[max(0.75rem,var(--safe-bottom))] z-40 mx-auto max-w-md lg:hidden"
    >
      <div className="grid h-[var(--tabbar-height)] grid-cols-5 items-center rounded-[1.6rem] border border-white/60 bg-white/80 px-1.5 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35),0_2px_6px_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-150">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;

          if (item.href === "/invoices/new") {
            return (
              <div key={item.href} className="flex justify-center">
                <motion.div whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-[0_10px_22px_-8px_rgba(15,23,42,0.8)]"
                  >
                    <motion.span
                      animate={{ rotate: active ? 45 : 0 }}
                      transition={SPRING_LAYOUT}
                      className="flex"
                    >
                      <Plus className="h-6 w-6" strokeWidth={2.2} />
                    </motion.span>
                  </Link>
                </motion.div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="relative flex h-full flex-col items-center justify-center gap-0.5"
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                className="relative flex flex-col items-center gap-1 px-2 py-1.5"
              >
                {active ? (
                  <motion.span
                    layoutId="tab-active"
                    transition={SPRING_LAYOUT}
                    className="absolute inset-0 rounded-2xl bg-foreground/[0.07]"
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative h-[22px] w-[22px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-medium leading-none transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.short}
                </span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

export default BottomTabBar;
