"use client";

import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";

const WHY_CHOOSE_US = [
  {
    title: "Metodo personalizado",
    text: "Plan de aprendizaje por nivel, edad y objetivo musical real.",
  },
  {
    title: "Profesores activos",
    text: "Bateristas con experiencia en escenario, grabacion y formacion.",
  },
  {
    title: "Seguimiento real",
    text: "Medimos progreso con metas concretas para mantener motivacion.",
  },
  {
    title: "Estudio profesional",
    text: "Clases en ambiente moderno, acusticamente cuidado y equipado.",
  },
];

const TEACHERS = [
  {
    name: "Efren Balderrama",
    role: "Direccion academica / Bateria moderna",
    bio: "Enfoque tecnico + musical para acelerar resultados sin perder groove.",
    image: "/image/profesor_efren_balderrama.png",
  },
  {
    name: "Equipo Session",
    role: "Ritmos latinos y pop",
    bio: "Trabajo de independencia, lectura y ejecucion para tocar en banda.",
    image: "/image/equipo_session.png",
  },
  {
    name: "Equipo Performance",
    role: "Rock, fusion y show en vivo",
    bio: "Entrenamiento de timing, dinamica y presencia de escenario.",
    image: "/image/equipo_performance.png",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "En pocas semanas ya estaba tocando canciones completas. Las clases son potentes y claras.",
    author: "Sofia, 19",
  },
  {
    quote:
      "Volvi a estudiar musica de adulto y me senti comodo desde el primer dia.",
    author: "Carlos, 34",
  },
  {
    quote:
      "Mi hijo mejoro su coordinacion y confianza. El seguimiento del progreso es excelente.",
    author: "Paola, mama de alumno",
  },
];

export default function AcademiaLandingPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a1a1a]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/image/logo_efrendrums.png"
              alt="Efrendrums"
              className="h-10 w-10 rounded-md object-cover"
            />
            <p className="text-xs sm:text-sm font-semibold tracking-wide">Academia de Bateria</p>
          </div>
          <div className="md:hidden">
            <AuthMenu />
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <a href="#porque" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Por que elegirnos
            </a>
            <a href="#profesores" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Profesores
            </a>
            <a href="#testimonios" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Testimonios
            </a>
            <a href="#clase-prueba" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Clase de prueba
            </a>
            <AuthMenu />
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <img
          src="/image/hero_aprende_bateria.png"
          alt="Baterista en estudio profesional"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/62" />
        <div className="mx-auto flex min-h-[75vh] w-full max-w-6xl flex-col justify-center px-4 py-20 md:px-6">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-red-400">Estudio moderno</p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Aprende bateria con energia profesional y resultados reales.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
            Clases para jovenes y adultos en un entorno de estudio inspirador: tecnica, musicalidad y
            performance desde la primera semana.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#clase-prueba"
              className="rounded-md bg-[#ff0000] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d10000]"
            >
              Reserva tu clase de prueba
            </a>
            <a
              href="#profesores"
              className="rounded-md border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Conoce al equipo
            </a>
          </div>
        </div>
      </section>

      <section id="porque" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-semibold md:text-3xl">Por que elegirnos</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {WHY_CHOOSE_US.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/10 bg-[#222222] p-5">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="profesores" className="bg-[#202020]">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">Nuestros Profesores</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TEACHERS.map((teacher) => (
              <article key={teacher.name} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="h-56 w-full rounded-lg object-cover"
                />
                <h3 className="mt-4 text-base font-semibold">{teacher.name}</h3>
                <p className="mt-1 text-xs text-red-400">{teacher.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{teacher.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-semibold md:text-3xl">Testimonios</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article key={item.author} className="rounded-xl border border-white/10 bg-[#222222] p-5">
              <p className="text-sm leading-relaxed text-white/90">"{item.quote}"</p>
              <p className="mt-4 text-xs text-red-400">{item.author}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="clase-prueba" className="bg-[#202020]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Clase de Prueba</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Completa el formulario y te contactamos para coordinar tu primera clase.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/75">
              <li>Duracion: 45 minutos</li>
              <li>Modalidad: presencial u online</li>
              <li>Respuesta: en menos de 24 horas</li>
            </ul>
          </div>

          <form className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5">
            <div className="grid gap-3">
              <input
                type="text"
                placeholder="Nombre completo"
                className="rounded-md border border-white/15 bg-[#262626] px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="tel"
                placeholder="WhatsApp"
                className="rounded-md border border-white/15 bg-[#262626] px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
              <select className="rounded-md border border-white/15 bg-[#262626] px-3 py-2 text-sm text-white">
                <option>Selecciona tu nivel</option>
                <option>Inicial</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
              <textarea
                rows={4}
                placeholder="Horario preferido y objetivos"
                className="rounded-md border border-white/15 bg-[#262626] px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
              <button
                type="button"
                className="mt-1 rounded-md bg-[#ff0000] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d10000]"
              >
                Quiero mi clase de prueba
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
