import type { ReactNode } from "react";
import InstallPromptMount from "./install-prompt-mount";

/**
 * Next.js App Router `template.tsx` is a special file that wraps every
 * route, much like `layout.tsx`, but is re-mounted on navigation. We
 * piggy-back on it to inject the PWA install prompt without forcing a
 * change to `app/layout.tsx` (owned/locked by another agent).
 *
 * The prompt itself is a client component that decides whether to show
 * anything based on the `beforeinstallprompt` event, iOS detection, and
 * the user's dismissal state — so this template stays a lean server
 * component.
 */
export default function RootTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <InstallPromptMount />
    </>
  );
}
