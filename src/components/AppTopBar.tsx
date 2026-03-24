"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMenu } from "@/components/AuthMenu";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/shop_estrellas", label: "Shop Estrellas" },
  { href: "/tienda", label: "Tienda" },
  { href: "/reportes", label: "Reportes" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/asistencia", label: "Asistencia" },
] as const;

export function AppTopBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return (
      <div className="fixed right-2 top-2 z-[5000] sm:right-4 sm:top-3">
        <AuthMenu />
      </div>
    );
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[5000] flex h-12 sm:h-14 items-stretch justify-between gap-2 sm:gap-4 border-b border-white/[0.22] bg-[linear-gradient(180deg,rgba(34,34,34,0.92)_0%,rgba(26,26,26,0.88)_100%)] px-2 sm:px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150"
      style={{ WebkitBackdropFilter: "blur(16px) saturate(1.35)" }}
    >
      <nav
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[8px] sm:text-[10px] tracking-tight text-white/95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${
                active
                  ? "bg-red-600/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "hover:bg-white/12 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2 border-l border-white/15 pl-2 sm:gap-3 sm:pl-3">
        <img
          src="/image/logo_efrendrums.png"
          alt="Efrendrums"
          className="h-7 w-auto rounded-md object-cover sm:h-8"
        />
        <AuthMenu />
      </div>
    </header>
  );
}
