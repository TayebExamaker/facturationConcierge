"use client";

import ClientOnly from "@/components/client-only";
import { PdfDropzone } from "@/components/import/pdf-dropzone";

const skeleton = (
  <div className="luxury-card border-2 border-dashed border-border/40 px-6 py-16 text-center">
    <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted/60" />
    <div className="mx-auto mt-4 h-5 w-56 animate-pulse rounded bg-muted/40" />
  </div>
);

export default function PdfDropzoneIsland() {
  return (
    <ClientOnly fallback={skeleton}>
      <PdfDropzone />
    </ClientOnly>
  );
}
