"use client";

import ClientOnly from "@/components/client-only";
import { PdfDropzone } from "@/components/import/pdf-dropzone";

const skeleton = (
  <div className="rounded-3xl border-2 border-dashed border-border bg-card px-6 py-20 text-center">
    <div className="mx-auto h-16 w-16 animate-pulse rounded-2xl bg-secondary" />
    <div className="mx-auto mt-4 h-5 w-56 animate-pulse rounded-lg bg-secondary" />
  </div>
);

export default function PdfDropzoneIsland() {
  return (
    <ClientOnly fallback={skeleton}>
      <PdfDropzone />
    </ClientOnly>
  );
}
