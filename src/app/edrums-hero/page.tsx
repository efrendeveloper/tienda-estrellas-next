"use client";

import Link from "next/link";
import { AppTopBar } from "@/components/AppTopBar";
import { useAuth } from "@/contexts/AuthContext";
import { EdrumsHeroGame } from "@/components/edrums-hero/EdrumsHeroGame";

export default function EdrumsHeroPage() {
  const { user, canEdit, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-cyan-300 tracking-wider">Cargando Edrums-Hero...</p>
        </div>
      </div>
    );
  }

  // Access Control: Only admins and collaborators can view
  if (!user || !canEdit) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4">
        <AppTopBar />
        <div className="w-full max-w-md bg-[#111827] border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl mt-12">
          <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-red-500/40">
            🔒
          </div>
          <h1 className="text-lg font-bold text-red-400 mb-2">Acceso Restringido</h1>
          <p className="text-xs text-gray-300 leading-relaxed mb-6">
            La sección <strong className="text-cyan-300">Edrums-hero</strong> está reservada
            exclusivamente para los <strong className="text-white">Administradores</strong> y{" "}
            <strong className="text-white">Colaboradores</strong> de la academia Efrendrums.
          </p>
          <Link
            href="/shop_estrellas"
            className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-lg"
          >
            Volver a la Tienda Estrellas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pt-14 pb-10">
      <AppTopBar />
      <main className="w-full px-2 sm:px-4 pt-4">
        <EdrumsHeroGame />
      </main>
    </div>
  );
}
