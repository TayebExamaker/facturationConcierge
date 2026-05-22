import { PageShell } from "@/components/layout/page-shell";
import PdfDropzoneIsland from "./_dropzone-island";

export const dynamic = "force-dynamic";

export default function ImportInvoicePage() {
  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">
          Concierge One
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-1">Import Invoice</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Drop a PDF invoice and we&rsquo;ll extract its line items, totals and
          metadata. You can edit anything that looks off before saving.
        </p>
      </div>
      <div className="gold-divider mb-6" aria-hidden="true" />

      <PdfDropzoneIsland />
    </PageShell>
  );
}
