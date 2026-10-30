"use client";

import ClientOnly from "@/components/client-only";
import { Toaster } from "sonner";

export default function ToasterIsland() {
  return (
    <ClientOnly>
      <Toaster
        theme="light"
        position="top-center"
        richColors
        offset="calc(env(safe-area-inset-top, 0px) + 12px)"
        toastOptions={{ className: "!rounded-2xl !shadow-[0_12px_40px_-12px_rgba(15,23,42,0.3)]" }}
      />
    </ClientOnly>
  );
}
