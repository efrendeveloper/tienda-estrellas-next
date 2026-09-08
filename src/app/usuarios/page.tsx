"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

interface AlumnoOption {
  id: string;
  nombre: string;
  monedas: number;
  estrellas: number;
}

interface UsuarioItem {
  id: string;
  email: string | null;
  username: string;
  role: "admin" | "collaborator" | "viewer" | "user";
  alumnoId: string | null;
  alumnoNombre: string | null;
  alumnoMonedas: number;
  alumnoEstrellas: number;
  updatedAt: string;
}

export default function GestionUsuariosPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Estados de lista
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estados del formulario
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"user" | "collaborator" | "admin">("user");
  const [selectedAlumnoId, setSelectedAlumnoId] = useState("");

  // Captcha
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  // Feedback del formulario
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Cargar Captcha
  const fetchNewCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    try {
      const res = await fetch("/api/captcha", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.token);
        setCaptchaAnswer("");
      }
    } catch (err) {
      console.error("Error al cargar captcha:", err);
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  // Cargar Alumnos registrados
  const fetchAlumnos = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("alumnos")
      .select("id, nombre, monedas, estrellas")
      .order("nombre", { ascending: true });
    if (data) {
      setAlumnos(
        data.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          monedas: a.monedas ?? 0,
          estrellas: a.estrellas ?? 0,
        }))
      );
    }
  }, []);

  // Cargar lista de usuarios
  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/usuarios", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.users || []);
      }
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    if (isAdmin) {
      Promise.all([fetchAlumnos(), fetchUsuarios(), fetchNewCaptcha()]).finally(
        () => setLoadingData(false)
      );
    }
  }, [isAdmin, fetchAlumnos, fetchUsuarios, fetchNewCaptcha]);

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener un mínimo de 6 caracteres.");
      return;
    }

    if (role === "user" && !selectedAlumnoId) {
      setFormError("Para usuarios de tipo Alumno, debes vincular un alumno registrado.");
      return;
    }

    if (!captchaAnswer.trim()) {
      setFormError("Por favor, introduce el código del Captcha.");
      return;
    }

    setFormBusy(true);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          confirmPassword,
          role,
          alumnoId: selectedAlumnoId || null,
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Ocurrió un error al dar de alta el usuario.");
        // Refrescar captcha al fallar
        void fetchNewCaptcha();
        return;
      }

      setFormSuccess(data.message || `Usuario "${username}" creado exitosamente.`);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setSelectedAlumnoId("");
      setRole("user");
      void fetchNewCaptcha();
      void fetchUsuarios();
    } catch (err: unknown) {
      console.error("Error al registrar usuario:", err);
      setFormError("Error de conexión al servidor al dar de alta el usuario.");
      void fetchNewCaptcha();
    } finally {
      setFormBusy(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el acceso del usuario "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "No se pudo eliminar el usuario.");
      }
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      alert("Error al conectar con el servidor.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6 text-white font-sans">
        <p className="text-sm opacity-70">Verificando credenciales...</p>
      </div>
    );
  }

  // Protección exclusiva para administrador
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center shadow-2xl backdrop-blur">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400 mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Acceso Exclusivo de Administrador</h1>
          <p className="text-xs text-white/70 mb-6 leading-relaxed">
            Esta sección es únicamente accesible para el Profesor o Director de Efrendrums para gestionar las cuentas y roles del sistema.
          </p>
          <Link
            href="/shop_estrellas"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-lg"
          >
            ← Volver a Shop Estrellas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pt-16 pb-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-semibold text-red-300 uppercase tracking-wider">
                Panel de Administrador
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Alta y Gestión de Usuarios</span>
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Crea credenciales con nombre de usuario y contraseña para alumnos, colaboradores y profesores.
            </p>
          </div>
          <Link
            href="/shop_estrellas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a Estrellas
          </Link>
        </header>

        {/* Grid: Formulario de Alta a la izquierda / Info y Roles a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Formulario */}
          <div className="lg:col-span-7 bg-[#161616] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400" />
            
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Dar de Alta Nuevo Usuario
            </h2>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-200 flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200 flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nombre de Usuario */}
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">
                  Nombre de Usuario <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="ej. carlos_drum o alumno_mateo"
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <p className="text-[10px] text-white/50 mt-1">
                  El alumno o usuario usará este nombre para iniciar sesión sin necesidad de recordar un correo largo.
                </p>
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5">
                  Tipo de Rol <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("user")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      role === "user"
                        ? "border-emerald-500/80 bg-emerald-950/30 text-emerald-200 shadow-md ring-1 ring-emerald-500/50"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Alumno (user)</div>
                    <div className="text-[9px] text-white/60 leading-tight mt-0.5">
                      Solo ve estrellas, compra con sus monedas.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("collaborator")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      role === "collaborator"
                        ? "border-blue-500/80 bg-blue-950/30 text-blue-200 shadow-md ring-1 ring-blue-500/50"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Colaborador</div>
                    <div className="text-[9px] text-white/60 leading-tight mt-0.5">
                      Edita ítems y asistencia, no elimina alumnos.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      role === "admin"
                        ? "border-red-500/80 bg-red-950/30 text-red-200 shadow-md ring-1 ring-red-500/50"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Admin (Profesor)</div>
                    <div className="text-[9px] text-white/60 leading-tight mt-0.5">
                      Control total, alta y eliminación.
                    </div>
                  </button>
                </div>
              </div>

              {/* Asignar Alumno */}
              <div>
                <label className="block text-xs font-medium text-white/90 mb-1.5 flex items-center justify-between">
                  <span>Asignar Alumno {role === "user" && <span className="text-emerald-400 font-semibold">(Requerido para Alumnos)</span>}</span>
                  <span className="text-[10px] text-white/50">{alumnos.length} alumnos disponibles</span>
                </label>
                <select
                  value={selectedAlumnoId}
                  onChange={(e) => setSelectedAlumnoId(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#222] px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="">-- Seleccionar alumno a vincular --</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (💰 {a.monedas} monedas | ⭐ {a.estrellas} estrellas)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-white/50 mt-1">
                  Al vincular el alumno, cuando inicie sesión en la tienda verá exclusivamente sus monedas y comprará sus propios premios.
                </p>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/90 mb-1.5">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/90 mb-1.5">
                    Volver a poner la contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Toggle ver contraseña y validación */}
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-white transition-colors"
                >
                  {showPassword ? "🙈 Ocultar contraseñas" : "👁️ Mostrar contraseñas"}
                </button>
                {password && confirmPassword && (
                  <span className={password === confirmPassword ? "text-emerald-400 font-semibold" : "text-red-400"}>
                    {password === confirmPassword ? "✓ Coinciden" : "✗ No coinciden"}
                  </span>
                )}
              </div>

              {/* Captcha de Seguridad */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-white/90 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Verificación de Seguridad (Captcha) <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void fetchNewCaptcha()}
                    disabled={loadingCaptcha}
                    className="text-[10px] text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>{loadingCaptcha ? "Generando..." : "↻ Recargar código"}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Imagen Captcha */}
                  <div
                    className="w-full sm:w-auto h-[60px] rounded-lg overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center shrink-0 [&>svg]:h-full [&>svg]:w-auto"
                    dangerouslySetInnerHTML={{ __html: captchaSvg || "<div class='p-2 text-[10px] text-white/40'>Cargando...</div>" }}
                  />

                  {/* Input Captcha */}
                  <div className="w-full flex-1">
                    <input
                      type="text"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      maxLength={5}
                      placeholder="Escribe los 5 caracteres"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white uppercase tracking-widest placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                    <p className="text-[10px] text-white/50 mt-1">
                      Protección contra altas automatizadas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de Submit */}
              <button
                type="submit"
                disabled={formBusy}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3 text-xs font-bold text-white shadow-lg hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {formBusy ? "Registrando usuario en el sistema..." : "✓ Dar de Alta Usuario"}
              </button>
            </form>
          </div>

          {/* Información y Guía de Roles */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <span>Guía de Permisos por Rol</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="font-semibold text-emerald-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Rol: Alumno (user)
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-white/70 list-disc list-inside">
                    <li>Visualiza el tablero de estrellas sin modificar nada.</li>
                    <li>No puede agregar ni eliminar alumnos bajo ninguna circunstancia.</li>
                    <li>
                      <strong>En la Tienda:</strong> Ve exclusivamente sus propias monedas y compra premios para sí mismo.
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3">
                  <div className="font-semibold text-blue-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    Rol: Colaborador
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-white/70 list-disc list-inside">
                    <li>Puede sumar/restar monedas y estrellas en clase.</li>
                    <li>Puede registrar asistencias diarias.</li>
                    <li>Puede comprar en la tienda para cualquier alumno.</li>
                    <li><strong>No puede eliminar</strong> alumnos ni dar de alta usuarios.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3">
                  <div className="font-semibold text-red-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    Rol: Administrador (Profesor)
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-white/70 list-disc list-inside">
                    <li>Acceso absoluto a todas las secciones y reportes.</li>
                    <li>Alta, edición y eliminación de usuarios y alumnos.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tarjeta de Resumen Rápido */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5 text-xs text-white/80">
              <h4 className="font-semibold text-white mb-1">Inicio de Sesión Fácil</h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Los alumnos no necesitan correo real. Simplemente ingresan su <strong>Nombre de Usuario</strong> y su <strong>Contraseña</strong> en la ventana de Inicio de Sesión de la esquina superior.
              </p>
            </div>
          </div>
        </div>

        {/* Listado de Usuarios Registrados */}
        <section className="bg-[#161616] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Usuarios Registrados en el Sistema</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-white/70">
                  {usuarios.length}
                </span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Cuentas activas que pueden autenticarse en la plataforma.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchUsuarios()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors"
            >
              ↻ Actualizar Lista
            </button>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-xs text-white/50">
              Cargando usuarios registrados...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/50">
              No hay usuarios registrados aún. Utiliza el formulario superior para crear el primero.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/90">
                <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/60">
                  <tr>
                    <th className="p-3 rounded-l-lg">Nombre de Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Alumno Vinculado</th>
                    <th className="p-3">Monedas / Estrellas</th>
                    <th className="p-3">Identificador / Correo</th>
                    <th className="p-3 rounded-r-lg text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usuarios.map((u) => {
                    const isUserRole = u.role === "user";
                    const isAdminRole = u.role === "admin";
                    const isCollabRole = u.role === "collaborator";

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-300">@{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {isAdminRole && (
                            <span className="inline-flex items-center rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                              Admin (Profesor)
                            </span>
                          )}
                          {isCollabRole && (
                            <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                              Colaborador
                            </span>
                          )}
                          {isUserRole && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Alumno (user)
                            </span>
                          )}
                          {!isAdminRole && !isCollabRole && !isUserRole && (
                            <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {u.alumnoNombre ? (
                            <span className="font-medium text-white">{u.alumnoNombre}</span>
                          ) : (
                            <span className="text-white/40 italic">Sin alumno vinculado</span>
                          )}
                        </td>
                        <td className="p-3">
                          {u.alumnoNombre ? (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-amber-400 font-mono">💰 {u.alumnoMonedas}</span>
                              <span className="text-yellow-300 font-mono">⭐ {u.alumnoEstrellas}</span>
                            </div>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-white/60 font-mono truncate max-w-[200px]" title={u.email || ""}>
                          {u.email || "—"}
                        </td>
                        <td className="p-3 text-right">
                          {user?.id !== u.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="rounded-lg bg-red-600/20 border border-red-500/30 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-600 hover:text-white transition-colors"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
