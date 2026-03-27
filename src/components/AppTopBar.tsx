"use client";

import { useState } from "react";
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
  const [navOpen, setNavOpen] = useState(false);

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
      className="fixed top-0 left-0 right-0 z-[5000] flex h-12 sm:h-14 items-stretch justify-between gap-2 sm:gap-4 border-b border-white/10 bg-[#1a1a1a]/95 px-2 sm:px-4 font-sans backdrop-blur"
    >
      <nav
        className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1 md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setNavOpen(false)}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[8px] sm:text-[10px] tracking-tight text-white/95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${
                active
                  ? "bg-red-600/85"
                  : "hover:bg-white/12 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="relative flex shrink-0 items-center gap-2 border-l border-white/15 pl-2 sm:gap-3 sm:pl-3">
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-[#1a1a1a] text-white hover:bg-white/10 md:hidden"
          aria-label="Abrir menú principal"
          aria-expanded={navOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <img
          src="/image/logo_efrendrums.png"
          alt="Efrendrums"
          className="h-7 w-auto rounded-md object-cover sm:h-8"
        />
        <AuthMenu />
        {navOpen && (
          <div className="absolute right-0 top-11 w-48 rounded-xl border border-white/15 bg-[#1a1a1a] p-2 shadow-2xl md:hidden">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setNavOpen(false)}
                  className={`mb-1 block rounded-md px-3 py-2 text-[11px] text-white ${
                    active ? "bg-red-600/85" : "hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
