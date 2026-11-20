// Canonical TypeScript types matching the public.invoices table.
// Keep this file in sync with supabase/migrations/0001_init.sql.

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceSource = "created" | "imported";
/** See supabase/migrations/0006_credit_notes.sql. */
export type DocumentType = "invoice" | "credit_note";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: number;
  label: string;
  client_name: string;
  client_address: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  payment_terms: string | null;
  payment_instructions: string | null;
  po_number: string | null;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  shipping: number;
  total: number;
  to_be_paid: number;
  notes: string | null;
  status: InvoiceStatus;
  source: InvoiceSource;
  pdf_url: string | null;
  company: string;
  /** Absent on rows read from a DB that predates 0006 — treat as "invoice". */
  document_type?: DocumentType;
  /** Credit notes only: the invoice being credited. */
  credited_invoice_id?: string | null;
  credited_invoice_number?: number | null;
  created_at: string;
  updated_at: string;
}

// Input shape used by createInvoice / updateInvoice server actions.
// Mirrors Invoice minus server-managed fields (id, timestamps).
// `label` is derived server-side if omitted.
export interface InvoiceInput {
  invoice_number: number;
  label?: string;
  client_name: string;
  client_address?: string | null;
  date: string;
  payment_terms?: string | null;
  payment_instructions?: string | null;
  po_number?: string | null;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  shipping: number;
  total: number;
  to_be_paid: number;
  notes?: string | null;
  status?: InvoiceStatus;
  source?: InvoiceSource;
  pdf_url?: string | null;
  document_type?: DocumentType;
  credited_invoice_id?: string | null;
  credited_invoice_number?: number | null;
}

// public.app_settings — one row per company (see 0005_app_settings.sql).
// Holds the global payment block; invoices inherit it when their own
// `payment_instructions` is null.
export interface AppSettings {
  company: string;
  payment_instructions: string | null;
  updated_at: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  currency?: string;
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Database row interface (matches Postgres exactly, with snake_case + jsonb).
// Shape conforms to supabase-js v2's `GenericSchema` — all five keys
// (Tables/Views/Functions/Enums/CompositeTypes) must be present even when
// empty, otherwise `.insert()` falls back to `never[]` and inference breaks.
export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, "id" | "created_at" | "updated_at" | "label" | "company" | "payment_instructions"> & {
          id?: string;
          label?: string;
          company?: string;
          payment_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Invoice, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettings;
        Insert: Omit<AppSettings, "updated_at"> & { updated_at?: string };
        Update: Partial<AppSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      invoice_status: InvoiceStatus;
      invoice_source: InvoiceSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
