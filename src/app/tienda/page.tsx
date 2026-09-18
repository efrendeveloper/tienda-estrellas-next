"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { Alumno } from "@/types";
import { SHOP_ITEMS } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const IMAGE_PATH = "/image";

export default function TiendaPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [comprandoId, setComprandoId] = useState<string | null>(null);
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);

  const { user, role, canEdit, isUserStudent, isViewer, alumnoId } = useAuth();
  const supabase = createSupabaseClient();

  const fetchAlumnos = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("alumnos")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) {
      console.error(error);
      setAlumnos([]);
      return;
    }
    type Row = Database["public"]["Tables"]["alumnos"]["Row"];
    setAlumnos(
      ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        monedas: r.monedas ?? 0,
        estrellas: r.estrellas ?? 0,
        maxiestrellas: r.maxiestrellas ?? 0,
        ultraestrellas: r.ultraestrellas ?? 0,
        hongos: r.hongos ?? 0,
        item_box: r.item_box ?? 0,
        luna: r.luna ?? 0,
        pow: r.pow ?? 0,
        cerezas: r.cerezas ?? 0,
        hongo_gold: r.hongo_gold ?? 0,
        key: r.key ?? 0,
        rayo: r.rayo ?? 0,
        red_coin: r.red_coin ?? 0,
        cube_yellow: r.cube_yellow ?? 0,
        created_at: r.created_at,
      }))
    );
  }, [supabase]);

  useEffect(() => {
    fetchAlumnos().finally(() => setLoading(false));
  }, [fetchAlumnos]);

  // Es alumno o viewer vinculado
  const isStudentOrViewer = isViewer || isUserStudent || role === "viewer" || role === "user";

  // Identificar el alumno vinculado (por alumnoId del perfil o fallback por username/email)
  const linkedAlumnoId = alumnoId || (
    isStudentOrViewer && user?.email && alumnos.length > 0
      ? (alumnos.find((a) => {
          const prefix = (user.email ?? "").split("@")[0].toLowerCase().trim();
          return a.nombre.toLowerCase().trim() === prefix;
        })?.id ?? null)
      : null
  );

  // Si el usuario es un viewer o alumno con alumno vinculado, fijar automáticamente su selección
  const hasLockedStudent = isStudentOrViewer && !!linkedAlumnoId && !canEdit;

  useEffect(() => {
    if (hasLockedStudent && linkedAlumnoId) {
      setSelectedId(linkedAlumnoId);
    }
  }, [hasLockedStudent, linkedAlumnoId]);

  // Alumno activo para compras y visualización
  const effectiveAlumnoId = hasLockedStudent && linkedAlumnoId ? linkedAlumnoId : selectedId;
  const currentAlumno = alumnos.find((x) => x.id === effectiveAlumnoId);

  // Puede comprar si es admin/colaborador, o si es viewer/alumno con alumno vinculado
  const puedeComprar = canEdit || (hasLockedStudent && currentAlumno !== undefined);

  const comprar = useCallback(
    async (item: (typeof SHOP_ITEMS)[0]) => {
      const targetId = effectiveAlumnoId;

      if (!targetId) {
        alert("Por favor, selecciona un alumno para realizar la compra.");
        return;
      }

      const alumnoTarget = alumnos.find((x) => x.id === targetId);
      if (!alumnoTarget) {
        alert("Alumno no encontrado.");
        return;
      }

      if (alumnoTarget.monedas < item.price) {
        alert(`Saldo insuficiente. Tienes ${alumnoTarget.monedas} 💰 y necesitas ${item.price} 💰.`);
        return;
      }

      setComprandoId(item.id);

      try {
        // Realizar compra a través del endpoint seguro
        const res = await fetch("/api/tienda/comprar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alumnoId: targetId,
            itemId: item.id,
            userId: user?.id,
            userRole: role,
            userAlumnoId: linkedAlumnoId || targetId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "No se pudo procesar la compra.");
          return;
        }

        // Sonido de moneda
        try {
          if (typeof window !== "undefined") {
            if (!coinAudioRef.current) {
              coinAudioRef.current = new Audio("/sound/coin_collect.mp3");
              coinAudioRef.current.volume = 0.9;
            }
            const snd = coinAudioRef.current;
            snd.pause();
            snd.currentTime = 0;
            void snd.play().catch(() => {});
          }
        } catch {
          /* ignore audio error */
        }

        // Actualizar lista
        await fetchAlumnos();
        alert(`🎉 ¡Compra exitosa: ${item.title}! Te quedan ${data.nuevasMonedas} monedas.`);
      } catch (err) {
        console.error("Error al comprar:", err);
        alert("Error de conexión al procesar la compra.");
      } finally {
        setComprandoId(null);
      }
    },
    [effectiveAlumnoId, alumnos, user?.id, role, linkedAlumnoId, fetchAlumnos]
  );

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#ff003c] via-[#ff8c00] to-[#ffd700]">
        <div className="text-center text-sm max-w-md bg-black/20 rounded-xl p-6 text-white">
          <p className="mb-2">Configura Supabase (ver .env.local.example y README).</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#ff003c] via-[#ff8c00] to-[#ffd700]">
        <p className="text-sm text-white">Cargando tienda de estrellas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff003c] via-[#ff8c00] to-[#ffd700] text-white p-4 md:p-6 pt-16">
      <header className="flex flex-wrap items-center gap-3 mb-6 px-0 pt-1">
        <img
          src={`${IMAGE_PATH}/logo_efrendrums.png`}
          alt="logo"
          className="h-14 rounded-lg object-cover shadow-md"
        />
        <div className="flex-1 flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div>
            <h1 className="text-base sm:text-lg font-bold">Tienda de Recompensas - Efrendrums</h1>
            <p className="text-[11px] text-white/80">Canjea tus monedas ganadas por ítems especiales.</p>
          </div>
          <Link
            href="/shop_estrellas"
            className="text-xs px-3 py-2 rounded-lg bg-black/30 hover:bg-black/40 border border-white/20 transition-colors"
          >
            ← Volver a Estrellas
          </Link>
        </div>
      </header>

      {/* Aviso para visitantes no autenticados */}
      {!user && (
        <div className="mb-6 mx-auto max-w-4xl rounded-xl border border-amber-400/40 bg-black/40 px-4 py-3 text-xs text-amber-100 leading-relaxed text-center backdrop-blur shadow-lg">
          <strong className="text-amber-300">Modo Solo Lectura:</strong> Puedes explorar los precios de los ítems. Para canjear recompensas con tus monedas, inicia sesión con tu cuenta de alumno.
        </div>
      )}

      {/* Si es rol Alumno o Viewer pero aún no tiene alumno vinculado en su cuenta */}
      {isStudentOrViewer && !linkedAlumnoId && !canEdit && (
        <div className="mb-6 mx-auto max-w-4xl rounded-xl border border-amber-500/40 bg-red-950/40 px-4 py-3 text-xs text-amber-200 leading-relaxed text-center backdrop-blur shadow-lg">
          ⚠️ <strong>Cuenta sin alumno vinculado:</strong> Tu usuario aún no tiene un alumno asignado en el sistema. Pídele al profesor que vincule tu cuenta en el Panel de Administrador para ver tus monedas y habilitar tus compras.
        </div>
      )}

      {/* Saludo informativo para alumno o viewer con cuenta vinculada */}
      {hasLockedStudent && currentAlumno && (
        <div className="mb-6 mx-auto max-w-4xl rounded-xl border border-yellow-400/40 bg-black/50 px-4 py-3 text-xs text-yellow-100 leading-relaxed text-center backdrop-blur shadow-lg flex items-center justify-center gap-2">
          <span className="text-base">🎉</span>
          <span>
            ¡Bienvenido/a, <strong className="text-yellow-300 font-bold">{currentAlumno.nombre}</strong>! Tienes{" "}
            <strong className="text-yellow-300 font-bold">{currentAlumno.monedas} monedas</strong> disponibles para canjear en la tienda.
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto text-center">
        {/* Caso 1: Alumno o Viewer con alumno vinculado -> Checklist bloqueado exclusivamente para su cuenta */}
        {hasLockedStudent && currentAlumno ? (
          <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-3 bg-black/50 border border-yellow-400/60 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-yellow-400/20 border border-yellow-400/50 px-2.5 py-0.5 text-[10px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
                🔒 Alumno Vinculado
              </span>
              <label className="text-xs sm:text-sm font-semibold text-white/90">Alumno:</label>
            </div>

            <div className="relative inline-block">
              <select
                value={currentAlumno.id}
                disabled
                aria-label="Alumno vinculado"
                title="Cuenta vinculada exclusivamente a este alumno. No se puede seleccionar otro."
                className="px-3 py-2 rounded-lg border border-yellow-400/60 bg-white text-black text-xs sm:text-sm font-bold cursor-not-allowed opacity-95 shadow-md pr-8 appearance-none"
              >
                <option value={currentAlumno.id}>
                  {currentAlumno.nombre} (💰 {currentAlumno.monedas} monedas)
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black/70 font-bold text-xs">
                🔒
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-3 py-1.5 shadow-inner">
              <span className="text-xs text-white/90">Saldo disponible:</span>
              <span className="text-sm font-black text-yellow-300">
                💰 {currentAlumno.monedas} monedas
              </span>
            </div>
          </div>
        ) : (
          /* Caso 2: Profesor / Colaborador / Visitante -> Checklist interactivo para seleccionar alumno */
          <div className="mb-6 inline-block bg-black/40 border border-white/20 rounded-xl px-4 py-3 backdrop-blur">
            <label className="mr-2 text-xs sm:text-sm font-medium">Alumno:</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-lg border-0 bg-white text-black text-xs sm:text-sm font-medium focus:outline-none shadow"
            >
              <option value="">-- Selecciona un alumno --</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} (💰 {a.monedas} monedas)
                </option>
              ))}
            </select>
            {currentAlumno && (
              <span className="ml-3 text-xs font-semibold text-yellow-300">
                Saldo: {currentAlumno.monedas} 💰
              </span>
            )}
          </div>
        )}

        {/* Grid de Ítems de la Tienda */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-center">
          {SHOP_ITEMS.map((it) => {
            const saldoAlumno = currentAlumno?.monedas ?? 0;
            const tieneSaldo = saldoAlumno >= it.price;
            const botonDeshabilitado = !puedeComprar || !tieneSaldo || comprandoId === it.id;

            return (
              <div
                key={it.id}
                className={`card relative bg-black/40 border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 backdrop-blur ${
                  tieneSaldo && puedeComprar
                    ? "border-yellow-400/50 hover:border-yellow-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.6)]"
                    : "border-white/10 opacity-90"
                }`}
              >
                <img
                  src={`${IMAGE_PATH}/${it.file}`}
                  alt={it.title}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg"
                />
                <div className="text-xs font-semibold text-center leading-tight break-words w-full text-white">
                  {it.title}
                </div>
                <div className="text-xs font-bold bg-[#ffd65a] text-black px-2.5 py-1 rounded-full mt-1 shadow">
                  {it.price} 💰
                </div>

                <button
                  type="button"
                  onClick={() => void comprar(it)}
                  disabled={botonDeshabilitado}
                  className={`mt-1.5 w-full px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    botonDeshabilitado
                      ? "bg-white/20 text-white/40 cursor-not-allowed"
                      : "bg-white text-black hover:bg-yellow-400 shadow-md active:scale-95"
                  }`}
                >
                  {comprandoId === it.id
                    ? "Comprando..."
                    : !puedeComprar
                      ? "Bloqueado"
                      : !tieneSaldo
                        ? "Faltan monedas"
                        : "Comprar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
