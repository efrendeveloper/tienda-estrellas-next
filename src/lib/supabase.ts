import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type Supabase = SupabaseClient<Database>;

export function getProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0] || "default";
  } catch {
    return "default";
  }
}

export function getAuthStorageKey(): string {
  return `tienda-estrellas-auth-${getProjectRef(supabaseUrl)}`;
}

/**
 * Filtra errores benignos de AuthApiError (refresh token expirado/no encontrado)
 * que de otro modo activan el Error Overlay de Next.js (Turbopack) en desarrollo.
 */
function setupAuthErrorFilter() {
  if (typeof window === "undefined") return;
  const globalWin = window as unknown as { __supabase_error_filter_installed__?: boolean };
  if (globalWin.__supabase_error_filter_installed__) return;
  globalWin.__supabase_error_filter_installed__ = true;

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    const msg =
      typeof first === "string"
        ? first
        : first && typeof first === "object" && "message" in first
        ? String((first as { message: unknown }).message)
        : "";
    const code =
      first && typeof first === "object" && "code" in first
        ? String((first as { code: unknown }).code)
        : "";

    if (
      msg.includes("Invalid Refresh Token") ||
      msg.includes("refresh_token_not_found") ||
      code === "refresh_token_not_found"
    ) {
      try {
        const storageKey = getAuthStorageKey();
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem("tienda-estrellas-auth");
      } catch {}
      // No pasar a console.error para evitar el overlay rojo de Turbopack
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

/**
 * Limpia sesiones huérfanas en localStorage si pertenecen a otro proyecto Supabase
 * o si están corruptas, antes de inicializar GoTrueClient.
 */
function sanitizeStoredSession(storageKey: string) {
  if (typeof window === "undefined") return;
  try {
    const keysToCheck = [storageKey, "tienda-estrellas-auth"];
    for (const key of keysToCheck) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token;
        if (typeof token === "string") {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const currentRef = getProjectRef(supabaseUrl);
            if (payload?.iss && !payload.iss.includes(currentRef)) {
              window.localStorage.removeItem(key);
            }
          }
        }
      } catch {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Una sola instancia en el navegador evita varios GoTrueClient (refresh / getSession)
 * compitiendo y provocando AbortError: "signal is aborted without reason".
 */
let browserClient: Supabase | null = null;

export function createSupabaseClient(): Supabase | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (typeof window !== "undefined") {
    setupAuthErrorFilter();

    if (!browserClient) {
      const storageKey = getAuthStorageKey();
      sanitizeStoredSession(storageKey);

      browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey,
        },
      });
    }
    return browserClient;
  }

  // SSR / pre-render: instancia efímera (no guardar en singleton de módulo).
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
