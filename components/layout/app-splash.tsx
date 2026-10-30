import * as React from "react";

/**
 * Branded splash shown while the client shell mounts (it is the server-
 * rendered fallback of the root <ClientOnly>), so a cold start paints the
 * brand immediately instead of a blank page. CSS-only, no JS required.
 */
export function AppSplash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background">
      <div className="animate-splash-in">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, rendered before React mounts */}
        <img
          src="/brand/logo.jpeg"
          alt="Concierge One"
          width={72}
          height={72}
          className="rounded-[18px] shadow-[0_20px_40px_-16px_rgba(15,23,42,0.5)]"
        />
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-route-progress rounded-full bg-foreground/80" />
      </div>
    </div>
  );
}

export default AppSplash;
