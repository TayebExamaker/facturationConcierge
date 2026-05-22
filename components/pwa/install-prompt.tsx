"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chromium / Edge / Android-Chrome fires `beforeinstallprompt`. We capture it,
 * suppress the native banner, and show our own luxury card so the install CTA
 * matches the rest of the product.
 *
 * iOS Safari does NOT fire that event — instead it requires the user to
 * manually tap Share → "Add to Home Screen". We detect iOS-non-standalone
 * and show alternate copy with a Share-icon hint, no Install button.
 *
 * Hidden entirely when the app is already running in standalone mode
 * (installed), or when the user dismissed the prompt in this browser
 * (persisted via localStorage so we don't nag).
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "cog-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  if (mql && mql.matches) return true;
  // Legacy iOS
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // localStorage may be unavailable (private mode etc.) — ignore.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setIosVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      // Defer briefly so we don't pop in on first paint.
      const t = window.setTimeout(() => setIosVisible(true), 1500);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setDeferred(null);
    setIosVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
      }
    } catch {
      // Some browsers throw if prompt() is called twice; just dismiss UI.
      setDeferred(null);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  if (dismissed) return null;

  const showChromium = !!deferred;
  const showIos = iosVisible && !deferred;
  if (!showChromium && !showIos) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Install Concierge One Invoicing"
      className={cn(
        "fixed z-50 no-print",
        "left-1/2 -translate-x-1/2 bottom-4 w-[min(92vw,420px)]",
        "sm:left-auto sm:right-6 sm:bottom-6 sm:translate-x-0 sm:w-[380px]"
      )}
    >
      <div
        className={cn(
          "luxury-card relative p-5",
          "border-[hsl(43_53%_54%/0.35)]",
          "shadow-[0_0_0_1px_rgba(201,168,76,0.18),0_20px_60px_-20px_rgba(0,0,0,0.8)]",
          "backdrop-blur-sm bg-card/95"
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className={cn(
            "absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center",
            "rounded-md text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/60 transition-colors"
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              "bg-[hsl(43_53%_54%/0.12)] border border-[hsl(43_53%_54%/0.35)]"
            )}
            aria-hidden="true"
          >
            {showIos ? (
              <Share className="h-5 w-5 gold-text" />
            ) : (
              <Download className="h-5 w-5 gold-text" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="serif text-lg leading-tight text-foreground">
              Install Concierge One
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {showIos
                ? "Tap the Share icon, then “Add to Home Screen” for fast access."
                : "Add to your desktop or home screen for fast access."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-3 text-sm",
              "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              "transition-colors"
            )}
          >
            Not now
          </button>
          {showChromium ? (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "shadow-[0_4px_14px_-4px_rgba(201,168,76,0.45)]"
              )}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {installing ? "Installing…" : "Install"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
