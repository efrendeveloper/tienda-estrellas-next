"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function AuthMenu() {
  const router = useRouter();
  const { user, role, canEdit, loading, signIn, changePassword, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
    setEmail("");
    setPassword("");
    router.push("/shop_estrellas");
  };

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setOpen(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPassword !== confirmPassword) {
      setPwdError("Las contraseñas no coinciden");
      return;
    }
    setPwdBusy(true);
    const { error: err } = await changePassword(currentPassword, newPassword);
    setPwdBusy(false);
    if (err) {
      setPwdError(err);
      return;
    }
    setPwdOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const roleLabel =
    role === "admin"
      ? "Administrador"
      : role === "collaborator"
        ? "Colaborador"
        : role === "viewer"
          ? "Solo lectura"
          : null;

  return (
    <div className="relative flex items-center gap-2 text-[10px] sm:text-xs">
      {loading ? (
        <span className="text-white/60 whitespace-nowrap">…</span>
      ) : user ? (
        <>
          <span className="hidden sm:inline text-white/80 max-w-[140px] truncate" title={user.email ?? ""}>
            {user.email}
          </span>
          {roleLabel && (
            <span
              className={`rounded px-2 py-1 whitespace-nowrap ${
                canEdit ? "bg-emerald-600/90 text-white" : "bg-white/15 text-white/90"
              }`}
            >
              {roleLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="rounded-lg bg-[#ff0000]/85 px-3 py-1.5 text-white hover:bg-[#ff0000] disabled:opacity-50 whitespace-nowrap"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setPwdOpen(true);
              setPwdError(null);
            }}
            disabled={busy}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-white hover:bg-white/25 disabled:opacity-50 whitespace-nowrap"
            title="Cambiar contraseña"
          >
            Cambiar contraseña
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="rounded-lg bg-[#ff0000]/85 px-3 py-1.5 text-white hover:bg-[#ff0000] whitespace-nowrap"
        >
          Iniciar sesión
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#1a1a1a] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="auth-title" className="mb-4 text-xs text-white">
              Iniciar sesión
            </h2>
            <p className="mb-4 text-[10px] leading-relaxed text-white/70">
              Cuenta del profesor o colaborador. Los padres pueden ver la app sin iniciar sesión.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[10px] text-white/90">
                Correo
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border-0 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40"
                  placeholder="profesor@ejemplo.com"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-white/90">
                Contraseña
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border-0 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40"
                  required
                />
              </label>
              {error && (
                <p className="text-[10px] text-red-300" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-[#ff0000] py-2 text-[10px] text-white hover:bg-[#d90000] disabled:opacity-50"
                >
                  {busy ? "…" : "Entrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/25"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pwdOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPwdOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#1a1a1a] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pwd-title" className="mb-4 text-xs text-white">
              Cambiar contraseña
            </h2>
            <p className="mb-4 text-[10px] leading-relaxed text-white/70">
              Ingresa tu contraseña actual y la nueva contraseña.
            </p>
            <form onSubmit={(e) => void handleChangePassword(e)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[10px] text-white/90">
                Contraseña actual (opcional)
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-lg border-0 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40"
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-white/90">
                Nueva contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-lg border-0 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-white/90">
                Confirmar nueva contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-lg border-0 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40"
                  required
                />
              </label>
              {pwdError && (
                <p className="text-[10px] text-red-300" role="alert">
                  {pwdError}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={pwdBusy}
                  className="flex-1 rounded-lg bg-[#ff0000] py-2 text-[10px] text-white hover:bg-[#d90000] disabled:opacity-50"
                >
                  {pwdBusy ? "…" : "Actualizar"}
                </button>
                <button
                  type="button"
                  onClick={() => setPwdOpen(false)}
                  disabled={pwdBusy}
                  className="rounded-lg bg-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/25 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
