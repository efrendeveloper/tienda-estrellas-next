import Link from "next/link";

export default function EstadisticasPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8 text-white">
      <h1 className="mb-3 text-sm md:text-base">Estadísticas</h1>
      <p className="mb-6 text-[10px] leading-relaxed text-white/75">
        Resúmenes y gráficos de progreso de los alumnos (próximamente).
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-white/15 px-3 py-2 text-[10px] text-white hover:bg-white/25"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
