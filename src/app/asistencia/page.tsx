"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

type AlumnoRow = Pick<Database["public"]["Tables"]["alumnos"]["Row"], "id" | "nombre" | "created_at">;
type AsistenciaRow = Database["public"]["Tables"]["asistencias"]["Row"];
type AsistenciaEstado = "present" | "absent" | null;

type DiaClase = {
  dateIso: string;
  shortLabel: string;
  fullLabel: string;
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function monthRange(year: number, monthIndex: number) {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    fromIso: from.toISOString().slice(0, 10),
    toIso: to.toISOString().slice(0, 10),
  };
}

function getDiasClaseDelMes(year: number, monthIndex: number): DiaClase[] {
  const result: DiaClase[] = [];
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  for (let day = 1; day <= endDate; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    const weekDay = date.getUTCDay();
    if (weekDay === 2 || weekDay === 4 || weekDay === 5) {
      const dateIso = date.toISOString().slice(0, 10);
      const weekLabel = weekDay === 2 ? "Mar" : weekDay === 4 ? "Jue" : "Vie";
      result.push({
        dateIso,
        shortLabel: `${weekLabel} ${String(day).padStart(2, "0")}`,
        fullLabel: `${String(day).padStart(2, "0")}/${String(monthIndex + 1).padStart(2, "0")}/${year}`,
      });
    }
  }

  return result;
}

export default function AsistenciaPage() {
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [asistenciaMap, setAsistenciaMap] = useState<Record<string, AsistenciaEstado>>({});
  const supabase = createSupabaseClient();
  const { canEdit } = useAuth();

  const [selectedYear, selectedMonthNumber] = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return [y, m - 1];
  }, [selectedMonth]);

  const diasClase = useMemo(
    () => getDiasClaseDelMes(selectedYear, selectedMonthNumber),
    [selectedYear, selectedMonthNumber]
  );

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const range = monthRange(selectedYear, selectedMonthNumber);
    const [{ data: alumnosData, error: alumnosError }, { data: asistenciaData, error: asistenciaError }] =
      await Promise.all([
        supabase.from("alumnos").select("id, nombre, created_at").order("created_at", { ascending: true }),
        supabase
          .from("asistencias")
          .select("*")
          .gte("fecha", range.fromIso)
          .lte("fecha", range.toIso),
      ]);

    if (alumnosError || asistenciaError) {
      console.error("Error cargando asistencia:", alumnosError?.message ?? asistenciaError?.message);
      setAlumnos([]);
      setAsistenciaMap({});
      setLoading(false);
      return;
    }

    const parsedAlumnos = (alumnosData ?? []) as AlumnoRow[];
    const parsedAsistencia = (asistenciaData ?? []) as AsistenciaRow[];
    const nextMap: Record<string, AsistenciaEstado> = {};

    parsedAsistencia.forEach((row) => {
      const key = `${row.alumno_id}|${row.fecha}`;
      nextMap[key] = row.estado;
    });

    setAlumnos(parsedAlumnos);
    setAsistenciaMap(nextMap);
    setLoading(false);
  }, [selectedMonthNumber, selectedYear, supabase]);

  useEffect(() => {
    setLoading(true);
    void fetchData();
  }, [fetchData]);

  const setAsistencia = useCallback(
    async (alumnoId: string, dateIso: string, estado: AsistenciaEstado) => {
      if (!supabase || !canEdit) return;
      const key = `${alumnoId}|${dateIso}`;
      setSavingKey(key);
      const previous = asistenciaMap[key] ?? null;

      setAsistenciaMap((prev) => ({
        ...prev,
        [key]: estado,
      }));

      const payload: Database["public"]["Tables"]["asistencias"]["Insert"] = {
        alumno_id: alumnoId,
        fecha: dateIso,
        estado,
      };

      const { error } = await (supabase.from("asistencias") as any)
        .upsert(payload, { onConflict: "alumno_id,fecha" })
        .select("id")
        .single();

      if (error) {
        console.error("Error guardando asistencia:", error.message);
        setAsistenciaMap((prev) => ({
          ...prev,
          [key]: previous,
        }));
      }

      setSavingKey(null);
    },
    [asistenciaMap, canEdit, supabase]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-sm md:text-base">Asistencia</h1>
          <p className="mt-1 text-[11px] text-white/75">
            Lista por alumno para capturar asistencia de martes, jueves y viernes del mes.
          </p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="rounded-md border border-white/20 bg-[#262626] px-2 py-1.5 text-[11px] text-white"
          aria-label="Seleccionar mes"
        />
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] text-white/80">
        Mes actual: {MONTH_NAMES[selectedMonthNumber]} {selectedYear}. Click en <strong>P</strong> o{" "}
        <strong>F</strong> para registrar presente o falta.
      </div>

      {loading ? (
        <p className="text-xs text-white/75">Cargando lista de asistencia...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1f1f1f]">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-white/5">
                <th className="sticky left-0 z-10 min-w-[180px] border-b border-r border-white/10 bg-[#222] px-3 py-2 text-left">
                  Alumno
                </th>
                {diasClase.map((dia) => (
                  <th key={dia.dateIso} className="min-w-[92px] border-b border-white/10 px-2 py-2 text-center">
                    <span className="block">{dia.shortLabel}</span>
                    <span className="block text-[10px] text-white/55">{dia.fullLabel}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => (
                <tr key={alumno.id} className="border-b border-white/10">
                  <td className="sticky left-0 z-10 border-r border-white/10 bg-[#222] px-3 py-2">
                    {alumno.nombre}
                  </td>
                  {diasClase.map((dia) => {
                    const key = `${alumno.id}|${dia.dateIso}`;
                    const estado = asistenciaMap[key] ?? null;
                    const isSaving = savingKey === key;

                    return (
                      <td key={key} className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={!canEdit || isSaving}
                            onClick={() => void setAsistencia(alumno.id, dia.dateIso, "present")}
                            className={`rounded px-2 py-1 text-[10px] ${
                              estado === "present" ? "bg-green-600 text-white" : "bg-white/10 text-white/80"
                            } disabled:opacity-50`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit || isSaving}
                            onClick={() => void setAsistencia(alumno.id, dia.dateIso, "absent")}
                            className={`rounded px-2 py-1 text-[10px] ${
                              estado === "absent" ? "bg-red-600 text-white" : "bg-white/10 text-white/80"
                            } disabled:opacity-50`}
                          >
                            F
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {alumnos.length === 0 && (
                <tr>
                  <td colSpan={Math.max(diasClase.length + 1, 2)} className="px-4 py-6 text-center text-xs text-white/70">
                    No hay alumnos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!canEdit && (
        <p className="mt-3 text-[10px] text-white/65">Modo lectura: solo admin y collaborator pueden registrar asistencia.</p>
      )}

      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/25"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
