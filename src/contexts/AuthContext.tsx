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

type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "role" | "username" | "alumno_id"
>;

export type AppRole = "admin" | "collaborator" | "viewer" | "user";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  username: string | null;
  alumnoId: string | null;
  /** Profesor (admin) o colaborador: pueden editar alumnos y comprar en la tienda para cualquiera. */
  canEdit: boolean;
  /** Solo administrador: eliminar alumnos, gestión de usuarios (RLS también lo exige). */
  isAdmin: boolean;
  /** Es un alumno logueado con rol 'user'. */
  isUserStudent: boolean;
  /** Cargando sesión / perfil inicial */
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(raw: string | null | undefined): AppRole {
  if (raw === "admin" || raw === "collaborator" || raw === "viewer" || raw === "user") return raw;
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
  const [username, setUsername] = useState<string | null>(null);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Evita setState tras desmontar (Strict Mode / navegación) — reduce AbortError en cadena con fetch. */
  const mountedRef = useRef(true);

  const supabase = createSupabaseClient();

  const fetchProfile = useCallback(
    async (uid: string): Promise<{ role: AppRole; username: string | null; alumno_id: string | null }> => {
      if (!supabase) return { role: "viewer", username: null, alumno_id: null };
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, username, alumno_id")
          .eq("id", uid)
          .maybeSingle();
        if (error || !data) return { role: "viewer", username: null, alumno_id: null };
        const row = data as ProfileData;
        return {
          role: normalizeRole(row.role),
          username: row.username ?? null,
          alumno_id: row.alumno_id ?? null,
        };
      } catch (e) {
        if (!isAbortLike(e)) console.warn("fetchProfile:", e);
        return { role: "viewer", username: null, alumno_id: null };
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
        const prof = await fetchProfile(s.user.id);
        if (!mountedRef.current) return;
        setRole(prof.role);
        setUsername(prof.username);
        setAlumnoId(prof.alumno_id);
      } else {
        setRole(null);
        setUsername(null);
        setAlumnoId(null);
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
          const prof = await fetchProfile(s.user.id);
          if (!mountedRef.current) return;
          setRole(prof.role);
          setUsername(prof.username);
          setAlumnoId(prof.alumno_id);
        } else {
          setRole(null);
          setUsername(null);
          setAlumnoId(null);
        }
      })();
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const canEdit = role === "admin" || role === "collaborator";
  const isAdmin = role === "admin";
  const isUserStudent = role === "user";

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      if (!supabase) return { error: "Supabase no configurado" };
      const raw = identifier.trim();
      if (!raw) return { error: "Introduce un usuario o correo" };

      let targetEmail = raw;

      // Si no contiene '@', buscamos en profiles por username o generamos email sintético
      if (!raw.includes("@")) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("email, username")
            .ilike("username", raw)
            .maybeSingle();

          if (data && (data as { email?: string | null }).email) {
            targetEmail = (data as { email: string }).email;
          } else {
            // Intentar con el dominio local predeterminado para usuarios
            targetEmail = `${raw.toLowerCase()}@academia.efrendrums.local`;
          }
        } catch {
          targetEmail = `${raw.toLowerCase()}@academia.efrendrums.local`;
        }
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        // Si falló y no tenía @, intentar alternativamente como email directo por si acaso
        if (error && !raw.includes("@") && targetEmail !== `${raw.toLowerCase()}@academia.efrendrums.local`) {
          const fallback = await supabase.auth.signInWithPassword({
            email: `${raw.toLowerCase()}@academia.efrendrums.local`,
            password,
          });
          if (!fallback.error) return { error: null };
        }

        return { error: error?.message ?? null };
      } catch (e: unknown) {
        if (!isAbortLike(e)) console.warn("signIn error:", e);
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Error de conexión al servidor";
        return { error: `No se pudo conectar con el servidor de autenticación (${msg})` };
      }
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
      username,
      alumnoId,
      canEdit,
      isAdmin,
      isUserStudent,
      loading,
      signIn,
      changePassword,
      signOut,
    }),
    [
      user,
      session,
      role,
      username,
      alumnoId,
      canEdit,
      isAdmin,
      isUserStudent,
      loading,
      signIn,
      changePassword,
      signOut,
    ]
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
