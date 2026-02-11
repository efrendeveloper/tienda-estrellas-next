"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { Alumno } from "@/types";
import { ITEMS_FOR_DISPLAY } from "@/types";

const IMAGE_PATH = "/image";
const HOLD_TIME_MS = 3000;

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

  const supabase = createSupabaseClient();

  const fetchAlumnos = useCallback(async () => {
    const client = createSupabaseClient();
    if (!client) return;
    const { data, error } = await client
      .from("alumnos")
      .select("*")
      .order("created_at", { ascending: true });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from("alumnos") as any)
        .update({
          monedas: alumno.monedas,
          estrellas: alumno.estrellas,
          maxiestrellas: alumno.maxiestrellas,
          ultraestrellas: alumno.ultraestrellas,
          hongos: alumno.hongos,
          item_box: alumno.item_box,
          luna: alumno.luna,
        })
        .eq("id", alumno.id);
      fetchAlumnos();
    },
    [fetchAlumnos]
  );

  const addAlumno = async () => {
    const n = nombre.trim();
    if (!n) return;
    const client = createSupabaseClient();
    if (!client) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from("alumnos") as any).insert({
      nombre: n,
      monedas: 0,
      estrellas: 0,
      maxiestrellas: 0,
      ultraestrellas: 0,
      hongos: 0,
      item_box: 0,
      luna: 0,
    });
    setNombre("");
    fetchAlumnos();
  };

  const changeCount = useCallback(
    async (index: number, key: keyof Alumno, delta: number) => {
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
    [alumnos, saveAlumno]
  );

  const playCoin = () => {
    try {
      const a = new Audio("/coin_collect.mp3");
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  };

  const playCharge = useCallback((play: boolean) => {
    try {
      const a = new Audio("/charge.mp3");
      if (play) {
        a.volume = 0.35;
        a.loop = true;
        a.play().catch(() => {});
      } else {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
  }, []);

  const openRoulette = useCallback(
    async (alumnoIndex: number) => {
      const a = alumnos[alumnoIndex];
      if (a.monedas <= 0 || a.item_box <= 0) {
        alert("No tienes monedas o cajas suficientes para usar la ruleta.");
        return;
      }
      const keys = ITEMS_FOR_DISPLAY.map((it) => it.key);
      const choice = keys[Math.floor(Math.random() * keys.length)];
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
      setRouletteWinner(choice);
      setRouletteOpen(true);
      setTimeout(() => {
        setRouletteOpen(false);
        setRouletteWinner(null);
      }, 2000);
    },
    [alumnos, saveAlumno]
  );

  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number, key: string) => {
      if (key !== "item_box") return;
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
    [openRoulette, playCharge]
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
      <header className="flex items-center gap-3 p-4 md:p-6">
        <img
          src="/logo_efrendrums.jpeg"
          alt="Efrendrums"
          className="h-14 md:h-16 rounded-lg object-cover"
        />
        <h1 className="text-sm md:text-base lg:text-lg">
          Efrendrums — Gestión de Alumnos (v6.2)
        </h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAlumno()}
            placeholder="Nombre del alumno"
            className="px-3 py-2 rounded-lg border-0 bg-white/10 text-white placeholder-white/60 w-64 text-sm"
          />
          <button
            type="button"
            onClick={addAlumno}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#ff4747] to-[#ff9f00] text-white cursor-pointer text-sm hover:opacity-90"
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
              <div className="text-sm mb-2">{a.nombre}</div>
              <div className="flex flex-wrap gap-3">
                {ITEMS_FOR_DISPLAY.map((it) => (
                  <div
                    key={it.key}
                    className="item-box relative w-24 bg-[#1e50c5] rounded-xl p-2 text-center cursor-pointer overflow-visible transition-transform hover:scale-105"
                    data-key={it.key}
                    data-index={i}
                    onClick={(e) => {
                      if (it.key !== "item_box")
                        changeCount(i, it.key as keyof Alumno, 1);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
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
            No hay alumnos. Añade uno arriba.
          </p>
        )}
      </main>

      {/* Roulette result modal */}
      {rouletteOpen && rouletteWinner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#1e50c5] rounded-2xl p-8 flex flex-col items-center gap-4">
            <p className="text-sm">¡Premio!</p>
            <img
              src={`${IMAGE_PATH}/${ITEMS_FOR_DISPLAY.find((i) => i.key === rouletteWinner)?.file ?? "star.png"}`}
              alt=""
              className="w-32 h-32 object-contain winner-glow rounded-xl"
            />
            <p className="text-xs uppercase">{rouletteWinner}</p>
          </div>
        </div>
      )}
    </>
  );
}
