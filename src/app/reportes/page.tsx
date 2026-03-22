import Link from "next/link";

export default function ReportesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8 text-white">
      <h1 className="mb-3 text-sm md:text-base">Reportes</h1>
      <p className="mb-6 text-[10px] leading-relaxed text-white/75">
        Aquí podrás ver informes y exportaciones cuando estén disponibles.
      </p>
      <Link
        href="/tienda"
        className="inline-block rounded-lg bg-gradient-to-r from-[#1ecbe1] to-[#005cff] px-3 py-2 text-[10px] text-white hover:opacity-90"
      >
        Ir a la tienda
      </Link>
    </main>
  );
}
