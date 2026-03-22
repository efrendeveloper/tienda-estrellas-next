"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMenu } from "@/components/AuthMenu";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/reportes", label: "Reportes" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/asistencia", label: "Asistencia" },
] as const;

export function AppTopBar() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[5000] flex h-12 sm:h-14 items-stretch justify-between gap-2 sm:gap-4 border-b border-white/[0.22] bg-[linear-gradient(180deg,rgba(42,78,140,0.52)_0%,rgba(18,36,72,0.48)_100%)] px-2 sm:px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl backdrop-saturate-150"
      style={{ WebkitBackdropFilter: "blur(16px) saturate(1.35)" }}
    >
      <nav
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname === ""
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[8px] sm:text-[10px] tracking-tight text-white/95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                active
                  ? "bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  : "hover:bg-white/12"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center border-l border-white/15 pl-2 sm:pl-3">
        <AuthMenu />
      </div>
    </header>
  );
}
