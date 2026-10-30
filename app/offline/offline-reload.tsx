"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Client island for the offline fallback. Reloads the current location
 * so the service worker can re-attempt the original request once the
 * network is back. Also listens to the `online` event so the user sees
 * an enabled state the moment connectivity returns.
 */
export default function OfflineReload() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const retry = useCallback(() => {
    setPending(true);
    // Defer briefly so users see the spinner; the reload itself will
    // tear this component down.
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className={cn(
          "inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-semibold active:scale-[0.97]",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 transition-[background-color,transform]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-[0_10px_24px_-12px_rgba(15,23,42,0.7)]"
        )}
      >
        <RefreshCw
          className={cn("h-4 w-4", pending && "animate-spin")}
          aria-hidden="true"
        />
        {pending ? "Reconnecting…" : "Try again"}
      </button>
      <p
        className={cn(
          "text-xs",
          online ? "text-emerald-600" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {online ? "You're back online — tap to reload." : "Still offline."}
      </p>
    </div>
  );
}
