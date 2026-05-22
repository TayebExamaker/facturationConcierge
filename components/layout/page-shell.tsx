import * as React from "react";

import { TopNav } from "@/components/layout/top-nav";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Optional max-width override; defaults to Tailwind's `container` utility. */
  full?: boolean;
}

export function PageShell({ children, className, full = false }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main
        className={cn(
          "flex-1 w-full py-6 sm:py-10 lg:py-12",
          full ? "px-4 sm:px-6 lg:px-10" : "container",
          className,
        )}
      >
        {children}
      </main>
      <footer className="no-print border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <span className="serif tracking-widest uppercase">
          Concierge One Group Ltd
        </span>
        <span className="mx-2 opacity-40">|</span>
        <span>Luxury invoicing</span>
      </footer>
    </div>
  );
}

export default PageShell;
