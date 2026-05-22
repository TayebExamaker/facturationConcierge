"use client";

import * as React from "react";

/**
 * MVP confirm hook.
 *
 * Implementation note: this is the MVP stub. It delegates to `window.confirm`
 * so we get a working confirm UX immediately. A later iteration can swap in a
 * portal-rendered shadcn Dialog (`@/components/ui/dialog`) without changing
 * any caller — the hook's public surface is stable.
 *
 * The `<ConfirmDialog />` skeleton below is intentionally inert; it exists so
 * that future work can wire up Radix/shadcn Dialog state without grep-and-
 * replace across the codebase.
 */

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export function useConfirm(): { confirm: ConfirmFn } {
  const confirm = React.useCallback<ConfirmFn>(async (opts) => {
    if (typeof window === "undefined") return false;
    // MVP: native browser confirm. Title + description joined by blank line.
    const msg = `${opts.title}\n\n${opts.description}`;
    return window.confirm(msg);
  }, []);

  return { confirm };
}

/**
 * Skeleton placeholder for the future portal-rendered confirm dialog.
 * Currently renders nothing — callers should rely on `useConfirm().confirm()`
 * which uses `window.confirm` under the hood.
 *
 * Once `@/components/ui/dialog` is wired up, this can become a real Dialog
 * with imperative `.open(opts) -> Promise<boolean>` semantics via a ref or
 * context provider.
 */
export function ConfirmDialog(): React.ReactElement | null {
  return null;
}
