"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { Alumno } from "@/types";
import { SHOP_ITEMS } from "@/types";

const IMAGE_PATH = "/image";

export default function TiendaPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  const supabase = createSupabaseClient();

  const fetchAlumnos = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
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
        pow: r.pow ?? 0,
        created_at: r.created_at,
      }))
    );
  }, [supabase]);

  useEffect(() => {
    fetchAlumnos().finally(() => setLoading(false));
  }, [fetchAlumnos]);

  const comprar = useCallback(
    async (item: (typeof SHOP_ITEMS)[0]) => {
      if (!selectedId) {
        alert("Selecciona un alumno");
        return;
      }
      const a = alumnos.find((x) => x.id === selectedId);
      if (!a) return;
      if (a.monedas < item.price) {
        alert("Saldo insuficiente");
        return;
      }
      const updated = {
        ...a,
        monedas: Math.max(0, a.monedas - item.price),
        [item.key]: (a[item.key] ?? 0) + 1,
      };
      type Update = Database["public"]["Tables"]["alumnos"]["Update"];
      const payload: Update = {
        monedas: updated.monedas,
        estrellas: updated.estrellas,
        maxiestrellas: updated.maxiestrellas,
        ultraestrellas: updated.ultraestrellas,
        hongos: updated.hongos,
        item_box: updated.item_box,
        luna: updated.luna,
        pow: updated.pow,
      };
      const client = createSupabaseClient();
      if (!client) return;
      // @ts-expect-error Supabase client table generic infers never in strict build
      await client.from("alumnos").update(payload).eq("id", selectedId);
      fetchAlumnos();
      try {
        const snd = new Audio("/coin_collect.mp3");
        snd.currentTime = 0;
        snd.play().catch(() => {});
      } catch {}
      alert(`¡Compra realizada: ${item.title}!`);
    },
    [selectedId, alumnos, supabase, fetchAlumnos]
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
        <p className="text-sm text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff003c] via-[#ff8c00] to-[#ffd700] text-white p-4 md:p-6">
      <header className="flex items-center gap-3 mb-6">
        <img
          src="/logo_efrendrums.jpeg"
          alt="logo"
          className="h-14 rounded-lg object-cover"
        />
        <div className="flex-1 flex flex-wrap items-center gap-3">
          <h1 className="text-sm md:text-base">Shop Items - Efrendrums (v6.2)</h1>
          <Link
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-4">
          <label className="mr-2 text-sm">Alumno:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-2 rounded-lg border-0 bg-white/90 text-black text-sm"
          >
            <option value="">-- Selecciona --</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} 💰{a.monedas}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-center">
          {SHOP_ITEMS.map((it) => (
            <div
              key={it.id}
              className="card relative bg-white/10 rounded-xl p-4 w-40 flex flex-col items-center gap-2 transition-transform hover:scale-110 hover:shadow-[0_0_40px_16px_rgba(255,215,0,0.98)]"
            >
              <img
                src={`${IMAGE_PATH}/${it.file}`}
                alt={it.title}
                className="w-22 h-22 object-contain rounded-lg"
              />
              <div className="text-xs text-center leading-tight break-words w-full">
                {it.title}
              </div>
              <div className="text-xs bg-[#ffd65a] text-black px-2 py-1.5 rounded-lg mt-1">
                {it.price} 💰
              </div>
              <button
                type="button"
                onClick={() => comprar(it)}
                className="mt-1 px-3 py-2 rounded-lg bg-white text-black font-bold cursor-pointer text-xs hover:opacity-90"
              >
                Comprar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
