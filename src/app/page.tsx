"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { Alumno } from "@/types";
import { ITEMS_FOR_DISPLAY } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const IMAGE_PATH = "/image";
const HOLD_TIME_MS = 3000;

/** Orden visual como en el proyecto original (7 ítems en fila). */
const ROULETTE_STRIP_KEYS = [
  "estrellas",
  "maxiestrellas",
  "ultraestrellas",
  "hongos",
  "item_box",
  "luna",
  "monedas",
] as const;

type RouletteStripKey = (typeof ROULETTE_STRIP_KEYS)[number];

const ROULETTE_PRIZE_LABEL: Partial<Record<RouletteStripKey, string>> = {
  estrellas: "¡Estrella!",
  maxiestrellas: "¡Maxi estrella!",
  ultraestrellas: "¡Ultra estrella!",
  hongos: "¡Hongo 1-UP!",
  item_box: "¡Caja sorpresa!",
  luna: "¡Luna!",
  monedas: "¡Moneda!",
};

function stripItemFile(key: RouletteStripKey): string {
  return (
    ITEMS_FOR_DISPLAY.find((it) => it.key === key)?.file ?? "star.png"
  );
}
/** Pasos del carrusel de la ruleta (más pasos = giro más largo). */
const ROULETTE_SPIN_STEPS = 34;
/** Retardo por paso: empieza rápido y se va frenando (estilo original). */
function rouletteStepDelayMs(step: number): number {
  return 48 + step * 11;
}

export default function HomePage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const holdState = useRef<{
    timerActive: boolean;
    startTime: number;
    rafId: number | null;
    index: number;
    key: string;
  }>({ timerActive: false, startTime: 0, rafId: null, index: 0, key: "" });
  const rollingRef = useRef(false);
  /** Una sola instancia evita AbortError por play() encadenados y permite parar charge de verdad. */
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);
  const chargeAudioRef = useRef<HTMLAudioElement | null>(null);

  const { canEdit, isAdmin } = useAuth();
  const supabase = createSupabaseClient();

  const fetchAlumnos = useCallback(async () => {
    const client = createSupabaseClient();
    if (!client) return;
    const { data, error } = await client
      .from("alumnos")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Supabase fetch error:", error.message, error.code, error.details);
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
        created_at: r.created_at,
      }))
    );
  }, []);

  useEffect(() => {
    fetchAlumnos().finally(() => setLoading(false));
  }, [fetchAlumnos]);

  const saveAlumno = useCallback(
    async (alumno: Alumno) => {
      const client = createSupabaseClient();
      if (!client) return;
      type Update = Database["public"]["Tables"]["alumnos"]["Update"];
      const payload: Update = {
        monedas: alumno.monedas,
        estrellas: alumno.estrellas,
        maxiestrellas: alumno.maxiestrellas,
        ultraestrellas: alumno.ultraestrellas,
        hongos: alumno.hongos,
        item_box: alumno.item_box,
        luna: alumno.luna,
        pow: alumno.pow,
      };
      // @ts-expect-error Supabase client table generic infers never in strict build
      await client.from("alumnos").update(payload).eq("id", alumno.id);
      fetchAlumnos();
    },
    [fetchAlumnos]
  );

  const addAlumno = async () => {
    if (!canEdit) return;
    const n = nombre.trim();
    if (!n) return;
    const client = createSupabaseClient();
    if (!client) return;
    type Insert = Database["public"]["Tables"]["alumnos"]["Insert"];
    const payload: Insert = {
      nombre: n,
      monedas: 0,
      estrellas: 0,
      maxiestrellas: 0,
      ultraestrellas: 0,
      hongos: 0,
      item_box: 0,
      luna: 0,
      pow: 0,
    };
    // @ts-expect-error Supabase client table generic infers never in strict build
    await client.from("alumnos").insert(payload);
    setNombre("");
    fetchAlumnos();
  };

  const removeAlumno = useCallback(
    async (alumno: Alumno) => {
      if (!isAdmin) return;
      if (
        !window.confirm(
          `¿Eliminar a "${alumno.nombre}"? Se borrarán todos sus ítems. No se puede deshacer.`
        )
      ) {
        return;
      }
      const client = createSupabaseClient();
      if (!client) return;
      const { error } = await client.from("alumnos").delete().eq("id", alumno.id);
      if (error) {
        alert(error.message || "No se pudo eliminar (¿sesión o permisos?)");
        return;
      }
      fetchAlumnos();
    },
    [fetchAlumnos, isAdmin]
  );

  const playCoin = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      if (!coinAudioRef.current) {
        coinAudioRef.current = new Audio("/sound/coin_collect.mp3");
        coinAudioRef.current.volume = 0.9;
      }
      const a = coinAudioRef.current;
      a.pause();
      a.currentTime = 0;
      void a.play().catch(() => {});
    } catch {
      /* ignorar AbortError / autoplay bloqueado */
    }
  }, []);

  const playCharge = useCallback((play: boolean) => {
    try {
      if (typeof window === "undefined") return;
      if (!chargeAudioRef.current) {
        chargeAudioRef.current = new Audio("/sound/charge.mp3");
      }
      const a = chargeAudioRef.current;
      if (play) {
        a.volume = 0.35;
        a.loop = true;
        void a.play().catch(() => {});
      } else {
        a.pause();
        a.currentTime = 0;
      }
    } catch {
      /* ignorar */
    }
  }, []);

  const changeCount = useCallback(
    async (index: number, key: keyof Alumno, delta: number) => {
      if (!canEdit) return;
      if (
        key === "id" ||
        key === "nombre" ||
        key === "created_at"
      )
        return;
      const a = alumnos[index];
      const cur = Number((a as unknown as Record<string, number>)[key]) || 0;
      const next = Math.max(0, Math.min(999, cur + delta));
      if (next === cur) return;
      const updated = { ...a, [key]: next };
      const newList = [...alumnos];
      newList[index] = updated;
      setAlumnos(newList);
      await saveAlumno(updated);
      playCoin();
    },
    [alumnos, saveAlumno, playCoin, canEdit]
  );

  const openRoulette = useCallback(
    async (alumnoIndex: number) => {
      if (!canEdit) return;
      if (rollingRef.current) return;
      const a = alumnos[alumnoIndex];
      if (a.monedas <= 0 || a.item_box <= 0) {
        alert("No tienes monedas o cajas suficientes para usar la ruleta.");
        return;
      }
      rollingRef.current = true;
      const keys = ITEMS_FOR_DISPLAY.filter(
        (it) => it.key !== "pow" && it.key !== "monedas"
      ).map((it) => it.key);
      const choice = keys[Math.floor(Math.random() * keys.length)];
      setRouletteWinner(null);
      setRouletteOpen(true);
      setRouletteHighlight(3);

      for (let step = 0; step < ROULETTE_SPIN_STEPS; step += 1) {
        setRouletteHighlight(Math.floor(Math.random() * ROULETTE_STRIP_KEYS.length));
        playCoin();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) =>
          setTimeout(resolve, rouletteStepDelayMs(step))
        );
      }

      const winIdx = ROULETTE_STRIP_KEYS.indexOf(choice as RouletteStripKey);
      setRouletteHighlight(winIdx >= 0 ? winIdx : 0);
      setRouletteWinner(choice);
      const updated = {
        ...a,
        monedas: Math.max(0, a.monedas - 1),
        item_box: Math.max(0, a.item_box - 1),
        [choice]: (a as unknown as Record<string, number>)[choice] + 1,
      };
      const newList = [...alumnos];
      newList[alumnoIndex] = updated;
      setAlumnos(newList);
      await saveAlumno(updated);
      playCoin();
      setTimeout(() => {
        setRouletteOpen(false);
        setRouletteWinner(null);
        setRouletteHighlight(null);
        rollingRef.current = false;
      }, 2200);
    },
    [alumnos, saveAlumno, playCoin, canEdit]
  );

  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);
  /** Índice 0–6 en la tira de 7 ítems; resaltado durante el giro y al parar. */
  const [rouletteHighlight, setRouletteHighlight] = useState<number | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number, key: string) => {
      if (!canEdit) return;
      if (key !== "item_box") return;
      if (rollingRef.current) return;
      e.preventDefault();
      const state = holdState.current;
      if (state.timerActive) return;
      state.timerActive = true;
      state.startTime = performance.now();
      state.index = index;
      state.key = key;
      playCharge(true);
      const ringEl = (e.target as HTMLElement).closest(".item-box")?.querySelector(".ring");
      if (ringEl) ringEl.classList.remove("hidden");

      function step(now: number) {
        const elapsed = now - state.startTime;
        const progress = Math.min(1, elapsed / HOLD_TIME_MS);
        if (ringEl) {
          const circle = ringEl.querySelector(".circle") as HTMLElement;
          if (circle)
            circle.style.background = `conic-gradient(var(--gold) ${progress * 360}deg, rgba(255,255,255,0.06) ${progress * 360}deg)`;
        }
        if (progress >= 1) {
          cancelAnimationFrame(state.rafId!);
          state.timerActive = false;
          playCharge(false);
          if (ringEl) ringEl.classList.add("hidden");
          openRoulette(state.index);
          return;
        }
        state.rafId = requestAnimationFrame(step);
      }
      state.rafId = requestAnimationFrame(step);
    },
    [openRoulette, playCharge, canEdit]
  );

  const handlePointerUp = useCallback(() => {
    const state = holdState.current;
    if (!state.timerActive) return;
    state.timerActive = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    playCharge(false);
    document.querySelectorAll(".ring").forEach((el) => el.classList.add("hidden"));
  }, [playCharge]);

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-sm max-w-md bg-white/10 rounded-xl p-6">
          <p className="mb-2">Configura Supabase para usar la app.</p>
          <p className="text-xs opacity-80">
            Crea <code className="bg-white/20 px-1 rounded">.env.local</code> con
            NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (ver README).
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-2 md:px-6 md:pb-3 md:pt-3">
        <img
          src={`${IMAGE_PATH}/logo_efrendrums.png`}
          alt="Efrendrums"
          className="h-14 md:h-16 rounded-lg object-cover"
        />
        <h1 className="text-sm md:text-base lg:text-lg flex-1 min-w-0">
          Shop_estrellas(v6.2)
        </h1>
      </header>

      {!canEdit && (
        <div className="mx-4 md:mx-6 -mt-2 mb-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-[9px] sm:text-[10px] text-amber-100 leading-relaxed">
          <strong className="text-amber-50">Solo lectura.</strong> Los padres y visitantes pueden ver
          logros; para agregar alumnos, editar ítems o usar la ruleta, inicia sesión como{" "}
          <strong>administrador</strong> o <strong>colaborador</strong>.
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canEdit && addAlumno()}
            placeholder="Nombre del alumno"
            disabled={!canEdit}
            className="px-3 py-2 rounded-lg border-0 bg-white/10 text-white placeholder-white/60 w-64 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={addAlumno}
            disabled={!canEdit}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#ff4747] to-[#ff9f00] text-white cursor-pointer text-sm hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Agregar alumno
          </button>
          <Link
            href="/tienda"
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#1ecbe1] to-[#005cff] text-white text-sm hover:opacity-90"
          >
            Abrir tienda
          </Link>
        </div>

        <div className="space-y-4">
          {alumnos.map((a, i) => (
            <div
              key={a.id}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm">{a.nombre}</div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => void removeAlumno(a)}
                    aria-label={`Eliminar a ${a.nombre}`}
                    title="Eliminar alumno"
                    className="shrink-0 rounded-md border border-red-400/50 bg-black p-1.5 hover:border-red-300 hover:bg-red-950/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
                  >
                    <img
                      src={`${IMAGE_PATH}/trash-delete.png`}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain pointer-events-none"
                    />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {ITEMS_FOR_DISPLAY.map((it) => (
                  <div
                    key={it.key}
                    className={`item-box relative w-24 bg-[#1e50c5] rounded-xl p-2 text-center overflow-visible transition-transform ${
                      canEdit
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-default opacity-95"
                    }`}
                    data-key={it.key}
                    data-index={i}
                    onClick={(e) => {
                      if (!canEdit) return;
                      if (it.key !== "item_box")
                        changeCount(i, it.key as keyof Alumno, 1);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!canEdit) return false;
                      if (it.key !== "item_box")
                        changeCount(i, it.key as keyof Alumno, -1);
                      return false;
                    }}
                    onPointerDown={(e) => handlePointerDown(e, i, it.key)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <div className="ring hidden absolute inset-1.5 rounded-lg flex items-center justify-center pointer-events-none">
                      <div
                        className="circle w-14 h-14 rounded-full bg-[#1e50c5] flex items-center justify-center opacity-95"
                        style={{
                          background:
                            "conic-gradient(var(--gold) 0deg, rgba(255,255,255,0.06) 0deg)",
                        }}
                      />
                    </div>
                    <img
                      src={`${IMAGE_PATH}/${it.file}`}
                      alt={it.key}
                      className="w-12 h-12 mx-auto mb-1 object-contain"
                    />
                    <div className="text-xs">
                      {(a as unknown as Record<string, number>)[it.key] ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {alumnos.length === 0 && (
          <p className="text-sm text-white/70 mt-6">
            {canEdit
              ? "No hay alumnos. Añade uno arriba."
              : "No hay alumnos registrados."}
          </p>
        )}
      </main>

      {/* Ruleta sorpresa — layout como proyecto original */}
      {rouletteOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-[#070f1c]/88 backdrop-blur-md text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Ruleta sorpresa"
        >
          <h2 className="px-5 pt-5 md:px-8 md:pt-6 text-[10px] sm:text-xs md:text-sm leading-relaxed tracking-wide text-white drop-shadow-sm">
            Ruleta sorpresa!
          </h2>

          <div className="flex flex-1 items-center justify-center px-3 py-6 md:px-6">
            <div
              className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 max-w-5xl ${!rouletteWinner ? "ruleta-strip-spinning" : ""}`}
            >
              {ROULETTE_STRIP_KEYS.map((key, i) => {
                const active =
                  rouletteHighlight !== null && i === rouletteHighlight;
                return (
                  <div
                    key={`${key}-${i}`}
                    className={`flex items-center justify-center rounded-xl p-2 md:p-3 transition-all duration-150 ${
                      active
                        ? "scale-110 opacity-100"
                        : "scale-100 opacity-45 md:opacity-50"
                    }`}
                  >
                    <img
                      src={`${IMAGE_PATH}/${stripItemFile(key)}`}
                      alt=""
                      className={`h-14 w-14 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem] object-contain ${active ? "winner-glow" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <p className="px-4 pb-6 md:pb-8 text-center text-[8px] sm:text-[10px] md:text-xs leading-relaxed text-white/95">
            {rouletteWinner
              ? ROULETTE_PRIZE_LABEL[rouletteWinner as RouletteStripKey] ??
                "¡Premio!"
              : "La ruleta se detendrá pronto..."}
          </p>
        </div>
      )}
    </>
  );
}
