"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

/**
 * Compact sticky header for phones/tablets. Transparent at the top of the
 * page, frosted with a hairline once content scrolls underneath — the iOS
 * navigation-bar behaviour.
 */
export function MobileTopBar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-30 pt-safe transition-[background-color,border-color,box-shadow] duration-300 lg:hidden",
        scrolled
          ? "border-b border-border/70 bg-background/80 shadow-[0_6px_20px_-16px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="container flex h-14 items-center justify-between">
        <Link href="/dashboard" aria-label="Concierge One — Dashboard">
          <Logo size={32} withWordmark className="[&_span:first-child]:text-sm" />
        </Link>
        <form action={logoutAction}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </motion.button>
        </form>
      </div>
    </header>
  );
}

export default MobileTopBar;
