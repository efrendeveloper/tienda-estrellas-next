import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type Supabase = SupabaseClient<Database>;

/**
 * Una sola instancia en el navegador evita varios GoTrueClient (refresh / getSession)
 * compitiendo y provocando AbortError: "signal is aborted without reason".
 */
let browserClient: Supabase | null = null;

export function createSupabaseClient(): Supabase | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (typeof window !== "undefined") {
    if (!browserClient) {
      browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return browserClient;
  }

  // SSR / pre-render: instancia efímera (no guardar en singleton de módulo).
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
