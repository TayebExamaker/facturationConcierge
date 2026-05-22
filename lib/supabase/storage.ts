import { createClient } from "./server";

const BUCKET = "invoice-pdfs";

export interface UploadedPdf {
  path: string;
  publicUrl: string;
}

/**
 * Upload a PDF (raw bytes) to the invoice-pdfs storage bucket.
 * Returns the storage path and a public URL. Throws on failure.
 */
export async function uploadInvoicePdf(
  fileBytes: ArrayBuffer | Uint8Array | Buffer,
  filename: string,
  opts?: { contentType?: string; upsert?: boolean }
): Promise<UploadedPdf> {
  const supabase = createClient();

  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;

  const body: Uint8Array | Buffer =
    fileBytes instanceof ArrayBuffer ? new Uint8Array(fileBytes) : fileBytes;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: opts?.contentType ?? "application/pdf",
    upsert: opts?.upsert ?? false,
  });
  if (error) {
    throw new Error(`Failed to upload PDF to storage: ${error.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: pub.publicUrl };
}

/**
 * Delete a PDF from the invoice-pdfs bucket by its storage path.
 */
export async function deleteInvoicePdf(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}

/**
 * Resolve a public URL for a path inside the invoice-pdfs bucket.
 */
export function publicUrlFor(path: string): string {
  const supabase = createClient();
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
