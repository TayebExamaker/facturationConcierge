import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import PdfDropzoneIsland from "./_dropzone-island";

export const dynamic = "force-dynamic";

export default function ImportInvoicePage() {
  return (
    <PageShell>
      <PageHeader
        className="mx-auto max-w-3xl"
        eyebrow="Import"
        title="Import Invoice"
        description="Drop a PDF and we'll extract its line items, totals and metadata. Fix anything that looks off before saving."
      />
      <div className="mx-auto max-w-3xl">
        <PdfDropzoneIsland />
      </div>
    </PageShell>
  );
}
