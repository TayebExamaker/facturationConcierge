import type { Metadata } from "next";
import OfflineReload from "./offline-reload";

export const metadata: Metadata = {
  title: "Offline — Concierge One Invoicing",
  description: "You're offline. Your invoices are still safe.",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback served by the next-pwa service worker when a
 * navigation request fails. Pure server component: the brand mark is
 * inlined SVG (no asset fetch), the only client interactivity is the
 * "Try again" button in `./offline-reload.tsx`.
 */
export default function OfflinePage() {
  return (
    <main
      className={
        "min-h-[100dvh] flex items-center justify-center px-6 py-12 " +
        "bg-background text-foreground"
      }
    >
      <div className="w-full max-w-md">
        <div className="luxury-card p-8 sm:p-10 text-center">
          {/* Inline ink key — no network needed. */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary">
            <svg
              viewBox="0 0 512 512"
              width="64"
              height="64"
              role="img"
              aria-label="Concierge One key mark"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="offline-gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
              </defs>
              <g
                stroke="url(#offline-gold)"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="256" cy="160" r="72" strokeWidth="28" />
                <circle cx="256" cy="160" r="14" fill="url(#offline-gold)" stroke="none" />
                <line x1="256" y1="232" x2="256" y2="430" strokeWidth="28" />
                <line x1="256" y1="372" x2="312" y2="372" strokeWidth="28" />
                <line x1="256" y1="412" x2="296" y2="412" strokeWidth="28" />
              </g>
            </svg>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            You&apos;re offline
          </h1>
          <div className="gold-divider my-5 mx-auto w-32" />
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Your invoices are still safe. Reconnect to sync new activity and
            continue where you left off.
          </p>

          <div className="mt-8">
            <OfflineReload />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          CONCIERGE ONE GROUP LTD
        </p>
      </div>
    </main>
  );
}
