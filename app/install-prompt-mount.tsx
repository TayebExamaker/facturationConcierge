"use client";

/**
 * Tiny client island that mounts the PWA install prompt. Kept separate
 * from `app/template.tsx` (a server component) so we don't have to
 * convert the template — or `app/layout.tsx` — into a client component.
 */

import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function InstallPromptMount() {
  return <InstallPrompt />;
}
