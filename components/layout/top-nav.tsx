"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices/new", label: "New Invoice" },
  { href: "/invoices/import", label: "Import" },
];

export function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname?.startsWith(href)) ||
    (href === "/dashboard" && pathname === "/");

  return (
    <header className="no-print sticky top-0 z-40 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          aria-label="Concierge One — Dashboard"
        >
          {/* Show wordmark on tablet+, logo-only on phone to save space. */}
          <span className="sm:hidden">
            <Logo size={36} />
          </span>
          <span className="hidden sm:inline-flex">
            <Logo size={36} withWordmark />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-gold bg-gold/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {NAV_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "w-full",
                      isActive(link.href) && "text-gold",
                    )}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="gold-divider" aria-hidden="true" />
    </header>
  );
}

export default TopNav;
