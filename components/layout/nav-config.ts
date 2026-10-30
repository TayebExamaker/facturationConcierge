import {
  FileUp,
  LayoutGrid,
  Plus,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile tab bar. */
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutGrid },
  { href: "/clients", label: "Clients", short: "Clients", icon: Users },
  { href: "/invoices/new", label: "New Invoice", short: "New", icon: Plus },
  { href: "/invoices/import", label: "Import PDF", short: "Import", icon: FileUp },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings2 },
];

/**
 * Invoice detail pages (`/invoices/<id>`) belong to the Dashboard section —
 * that's where the user came from — while /invoices/new and /import have
 * their own tabs.
 */
export function isNavActive(href: string, pathname: string | null): boolean {
  const p = pathname ?? "";
  if (href === "/dashboard") {
    return (
      p === "/" ||
      p.startsWith("/dashboard") ||
      (p.startsWith("/invoices/") &&
        !p.startsWith("/invoices/new") &&
        !p.startsWith("/invoices/import"))
    );
  }
  return p === href || p.startsWith(`${href}/`);
}
