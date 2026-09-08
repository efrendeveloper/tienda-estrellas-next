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

  const { user, role, canEdit, isUserStudent, alumnoId } = useAuth();
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

  // Si es alumno logueado, fijar automáticamente su alumno vinculado
  useEffect(() => {
    if (isUserStudent && alumnoId) {
      setSelectedId(alumnoId);
    }
  }, [isUserStudent, alumnoId]);

  // Alumno activo según selección o vinculación
  const currentAlumno = alumnos.find((x) => x.id === (isUserStudent ? alumnoId : selectedId));

  const puedeComprar = canEdit || (isUserStudent && !!alumnoId && currentAlumno !== undefined);

  const comprar = useCallback(
    async (item: (typeof SHOP_ITEMS)[0]) => {
      const targetId = isUserStudent ? alumnoId : selectedId;

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
            userAlumnoId: alumnoId,
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
    [isUserStudent, alumnoId, selectedId, alumnos, user?.id, role, fetchAlumnos]
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

      {/* Aviso para visitantes no autenticados o solo lectura */}
      {!canEdit && !isUserStudent && (
        <div className="mb-6 mx-auto max-w-4xl rounded-xl border border-amber-400/40 bg-black/40 px-4 py-3 text-xs text-amber-100 leading-relaxed text-center backdrop-blur">
          <strong className="text-amber-300">Modo Solo Lectura:</strong> Puedes explorar los precios de los ítems. Para canjear recompensas con tus monedas, inicia sesión con tu <strong>Usuario y Contraseña</strong> de alumno.
        </div>
      )}

      {/* Si es rol Alumno pero no tiene alumno vinculado */}
      {isUserStudent && !alumnoId && (
        <div className="mb-6 mx-auto max-w-4xl rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-200 leading-relaxed text-center backdrop-blur">
          <strong>Cuenta de Alumno sin vincular:</strong> Tu usuario aún no tiene un alumno asignado. Pídele al profesor que vincule tu cuenta en la sección de Administrador para ver tus monedas.
        </div>
      )}

      <div className="max-w-5xl mx-auto text-center">
        {/* Caso 1: Alumno Logueado (Rol User) -> Solo se muestran sus monedas */}
        {isUserStudent && currentAlumno ? (
          <div className="mb-6 inline-flex flex-col sm:flex-row items-center gap-4 bg-black/50 border border-yellow-400/60 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur">
            <div className="h-12 w-12 rounded-full bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-2xl shadow-inner">
              🥁
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs uppercase tracking-wider text-yellow-300 font-semibold">
                Alumno Conectado: {currentAlumno.nombre}
              </div>
              <div className="text-xl sm:text-2xl font-black text-yellow-300 flex items-center justify-center sm:justify-start gap-2">
                <span>💰 {currentAlumno.monedas}</span>
                <span className="text-xs font-normal text-white/90">monedas disponibles</span>
              </div>
            </div>
          </div>
        ) : (
          /* Caso 2: Profesor / Colaborador / Visitante -> Selector de alumnos */
          <div className="mb-6 inline-block bg-black/40 border border-white/20 rounded-xl px-4 py-3">
            <label className="mr-2 text-xs sm:text-sm font-medium">Alumno:</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-lg border-0 bg-white text-black text-xs sm:text-sm font-medium focus:outline-none"
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
