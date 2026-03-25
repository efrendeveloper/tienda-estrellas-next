"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRoleRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "role">;

export type AppRole = "admin" | "collaborator" | "viewer";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** Profesor (admin) o colaborador: pueden editar alumnos y comprar en la tienda. */
  canEdit: boolean;
  /** Solo administrador: eliminar alumnos (RLS también lo exige). */
  isAdmin: boolean;
  /** Cargando sesión / perfil inicial */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(raw: string | null | undefined): AppRole {
  if (raw === "admin" || raw === "collaborator" || raw === "viewer") return raw;
  return "viewer";
}

function isAbortLike(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name: string }).name === "AbortError"
  )
    return true;
  return false;
}

function isInvalidRefreshTokenError(message: string | undefined): boolean {
  if (!message) return false;
  const text = message.toLowerCase();
  return (
    text.includes("invalid refresh token") ||
    text.includes("refresh token not found")
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  /** Evita setState tras desmontar (Strict Mode / navegación) — reduce AbortError en cadena con fetch. */
  const mountedRef = useRef(true);

  const supabase = createSupabaseClient();

  const fetchRole = useCallback(
    async (uid: string): Promise<AppRole> => {
      if (!supabase) return "viewer";
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        if (error || !data) return "viewer";
        const row = data as ProfileRoleRow;
        return normalizeRole(row.role);
      } catch (e) {
        if (!isAbortLike(e)) console.warn("fetchRole:", e);
        return "viewer";
      }
    },
    [supabase]
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    void (async () => {
      let s: Session | null = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error && isInvalidRefreshTokenError(error.message)) {
          // Token local huérfano/expirado: limpiamos sesión local sin ruido en consola.
          await supabase.auth.signOut({ scope: "local" });
        } else if (error && !isAbortLike(error)) {
          console.warn("getSession:", error.message);
        }
        s = data.session;
      } catch (e) {
        if (!isAbortLike(e)) console.warn("getSession error:", e);
        if (!mountedRef.current) return;
        setLoading(false);
        return;
      }
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const r = await fetchRole(s.user.id);
        if (!mountedRef.current) return;
        setRole(r);
      } else {
        setRole(null);
      }
      if (mountedRef.current) setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      void (async () => {
        if (!mountedRef.current) return;
        if (s?.user) {
          const r = await fetchRole(s.user.id);
          if (!mountedRef.current) return;
          setRole(r);
        } else {
          setRole(null);
        }
      })();
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchRole]);

  const canEdit = role === "admin" || role === "collaborator";
  const isAdmin = role === "admin";

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: "Supabase no configurado" };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Si el refresh token ya no existe en el servidor, limpiamos localmente.
      if (
        e &&
        typeof e === "object" &&
        "message" in e &&
        isInvalidRefreshTokenError(String((e as { message?: string }).message))
      ) {
        await supabase.auth.signOut({ scope: "local" });
        return;
      }
      throw e;
    }
  }, [supabase]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!supabase) return { error: "Supabase no configurado" };
      if (!user?.email) return { error: "Sesión inválida" };
      if (newPassword.length < 6) return { error: "La nueva contraseña debe tener al menos 6 caracteres" };

      try {
        // Primero intenta con la sesión activa.
        // Esto evita fallos por "Invalid login credentials" si la re-autenticación no coincide.
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (!updateError) return { error: null };

        // Fallback: si falla, y el usuario ingresó contraseña actual, re-autenticamos y reintentamos.
        if (!currentPassword.trim()) {
          return { error: updateError.message ?? "No se pudo cambiar la contraseña" };
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email.trim(),
          password: currentPassword,
        });
        if (reauthError) {
          return {
            error: reauthError.message ?? "No se pudo validar la contraseña actual",
          };
        }

        const { error: updateError2 } = await supabase.auth.updateUser({
          password: newPassword,
        });

        return { error: updateError2?.message ?? null };
      } catch (e: unknown) {
        if (!isAbortLike(e)) console.warn("changePassword:", e);
        return { error: "No se pudo cambiar la contraseña" };
      }
    },
    [supabase, user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      canEdit,
      isAdmin,
      loading,
      signIn,
      changePassword,
      signOut,
    }),
    [user, session, role, canEdit, isAdmin, loading, signIn, changePassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
