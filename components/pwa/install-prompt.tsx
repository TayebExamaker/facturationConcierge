"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { motion } from "motion/react";
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
    <motion.div
      role="dialog"
      aria-live="polite"
      aria-label="Install Concierge One Invoicing"
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "fixed z-50 no-print",
        // Phones: float just above the bottom tab bar.
        "inset-x-3 mx-auto max-w-md bottom-[calc(var(--tabbar-height)+max(0.75rem,var(--safe-bottom))+0.75rem)]",
        "lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
      )}
    >
      <div className="luxury-card relative bg-card/95 p-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className={cn(
            "absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center",
            "rounded-full bg-secondary text-muted-foreground hover:text-foreground",
            "transition-colors"
          )}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"
            aria-hidden="true"
          >
            {showIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-tight text-foreground">
              Install Concierge One
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {showIos
                ? "Tap Share, then “Add to Home Screen”."
                : "Add it to your desktop or home screen."}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-9 items-center rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Not now
          </button>
          {showChromium ? (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold",
                "bg-foreground text-background active:scale-[0.97]",
                "hover:bg-foreground/90 transition-[background-color,transform]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {installing ? "Installing…" : "Install"}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default InstallPrompt;
