"use client";

import ClientOnly from "@/components/client-only";
import { Toaster } from "sonner";

export default function ToasterIsland() {
  return (
    <ClientOnly>
      <Toaster theme="light" position="top-right" richColors />
    </ClientOnly>
  );
}
