"use server";

import { createClient } from "@/lib/supabase/server";
import { COMPANY_KEY } from "@/lib/company";
import {
  deriveClients,
  getClientProfile as deriveProfile,
  type ClientProfile,
  type ClientSummary,
} from "@/lib/clients";
import type { Invoice } from "@/lib/supabase/types";

/** All invoices for this company, newest first. Shared by the client actions. */
async function fetchCompanyInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("company", COMPANY_KEY)
    .order("date", { ascending: false });
  if (error) throw new Error(`Failed to load clients: ${error.message}`);
  return (data ?? []) as Invoice[];
}

/** Aggregated client directory derived from invoices. */
export async function listClients(): Promise<ClientSummary[]> {
  return deriveClients(await fetchCompanyInvoices());
}

/** A single client's profile + every invoice billed to them. */
export async function getClientProfile(
  key: string,
): Promise<ClientProfile | null> {
  return deriveProfile(await fetchCompanyInvoices(), key);
}

export interface ClientDirectoryEntry {
  name: string;
  address: string | null;
  currency: string;
}

/**
 * Slim list used by the invoice form to remember known clients — powers the
 * name autocomplete and address/currency prefill.
 */
export async function listClientDirectory(): Promise<ClientDirectoryEntry[]> {
  const clients = deriveClients(await fetchCompanyInvoices());
  return clients.map((c) => ({
    name: c.name,
    address: c.address,
    currency: c.currency,
  }));
}
