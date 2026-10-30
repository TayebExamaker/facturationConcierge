"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig } from "motion/react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { cn } from "@/lib/utils";

/** Routes rendered without any app chrome (full-bleed screens). */
const BARE_ROUTES = ["/login", "/offline"];

interface ChromeState {
  setImmersive: (on: boolean) => void;
}

const ChromeContext = React.createContext<ChromeState>({ setImmersive: () => {} });

/**
 * Hide the mobile tab bar while the calling component is mounted — used by
 * screens that own a fixed bottom action bar (the invoice form), exactly like
 * a native app pushing a full-screen editor.
 */
export function useImmersive(active = true) {
  const { setImmersive } = React.useContext(ChromeContext);
  React.useEffect(() => {
    if (!active) return;
    setImmersive(true);
    return () => setImmersive(false);
  }, [active, setImmersive]);
}

/**
 * Persistent application shell, mounted once in the root layout so the
 * navigation survives route changes (and its active-pill can glide between
 * items instead of re-mounting).
 *
 *   lg+   fixed sidebar on the left
 *   < lg  sticky top bar + floating bottom tab bar
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [immersive, setImmersive] = React.useState(false);
  const ctx = React.useMemo(() => ({ setImmersive }), []);

  const bare = BARE_ROUTES.some((r) => pathname?.startsWith(r));

  return (
    <MotionConfig reducedMotion="user">
      {bare ? (
        children
      ) : (
        <ChromeContext.Provider value={ctx}>
          <AppSidebar />
          <div className="flex min-h-[100dvh] flex-col lg:pl-[var(--sidebar-width)]">
            <MobileTopBar />
            <div
              className={cn(
                "flex flex-1 flex-col",
                immersive ? "pb-actionbar lg:pb-0" : "pb-tabbar lg:pb-0",
              )}
            >
              {children}
            </div>
          </div>
          <AnimatePresence>{immersive ? null : <BottomTabBar key="tabbar" />}</AnimatePresence>
        </ChromeContext.Provider>
      )}
    </MotionConfig>
  );
}

export default AppChrome;
