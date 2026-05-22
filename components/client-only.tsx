"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after the client has mounted.
 *
 * Why this is bulletproof against hydration mismatches:
 *   - SSR pass: `mounted` is `false` -> renders `fallback` (default: nothing).
 *   - Client first render (before effects): `mounted` is still `false`
 *     -> renders the same `fallback`. SSR and CSR initial paints match.
 *   - After `useEffect` fires (post-hydration): `mounted` flips to `true`
 *     -> children mount cleanly in a normal commit, not a hydration commit.
 *
 * Use for any subtree that includes react-hook-form, Radix Popover/Select,
 * sonner, native date inputs, or anything that reads window/navigator.
 */
export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
