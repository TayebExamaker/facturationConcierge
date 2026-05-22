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
          "inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 transition-colors",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-[0_4px_14px_-4px_rgba(201,168,76,0.45)]"
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
          online ? "text-[hsl(43_53%_54%)]" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {online ? "You're back online — tap to reload." : "Still offline."}
      </p>
    </div>
  );
}
