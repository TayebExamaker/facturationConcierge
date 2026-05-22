"use client";

import * as React from "react";

/**
 * Reactive media-query hook. SSR-safe: returns `false` during server render
 * and the first client render, then syncs to the actual match value in an
 * effect (avoids hydration mismatches).
 *
 *   const isDesktop = useMediaQuery(minWidth("md"));
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = React.useCallback((): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);

    // Sync once on mount.
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setMatches(e.matches);
    };

    // `addEventListener` is the modern API; `addListener` is the Safari <14 fallback.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    const legacy = mql as MediaQueryList & {
      addListener: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener: (cb: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener(handler);
    return () => legacy.removeListener(handler);
  }, [query, getMatch]);

  return matches;
}
