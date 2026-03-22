import Link from "next/link";

export default function AsistenciaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8 text-white">
      <h1 className="mb-3 text-sm md:text-base">Asistencia</h1>
      <p className="mb-6 text-[10px] leading-relaxed text-white/75">
        Control de asistencia de clase (próximamente).
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
