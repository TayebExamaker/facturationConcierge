// Canonical TypeScript types matching the public.invoices table.
// Keep this file in sync with supabase/migrations/0001_init.sql.

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceSource = "created" | "imported";

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
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  currency?: string;
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Database row interface (matches Postgres exactly, with snake_case + jsonb).
// Used internally by the Supabase client typings.
export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, "id" | "created_at" | "updated_at" | "label"> & {
          id?: string;
          label?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Invoice, "id" | "created_at" | "updated_at">>;
      };
    };
    Enums: {
      invoice_status: InvoiceStatus;
      invoice_source: InvoiceSource;
    };
  };
}
