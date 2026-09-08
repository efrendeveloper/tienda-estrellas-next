"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { useAuth } from "@/contexts/AuthContext";
import { CaptchaModal } from "@/components/CaptchaModal";

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

const POPULAR_VIDEOS = [
  {
    id: "W_o0_IfGNLc",
    title: "Tutorial 1 Bueno es Alabar",
  },
  {
    id: "wam0iMIYRQ8",
    title: "tutorial 3 Alabadle",
  },
  {
    id: "CzuoEwybec8",
    title: "Drumcover de Hashem Reina de Marcos Witt",
  },
];

export default function AcademiaLandingPage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    whatsapp: "",
    nivel: "Inicial",
    objetivos: "",
    honeypot: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleOpenCaptcha = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) {
      errors.nombre = "Introduce tu nombre completo";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = "Introduce tu correo electrónico";
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Introduce un correo electrónico válido";
    }
    if (!formData.whatsapp.trim()) {
      errors.whatsapp = "Introduce tu número de WhatsApp";
    } else if (formData.whatsapp.trim().length < 7) {
      errors.whatsapp = "Introduce un número válido (mínimo 7 dígitos)";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsCaptchaOpen(true);
  };

  const handleCaptchaSuccess = async (
    captchaAnswer: string,
    captchaToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/solicitar-clase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          captchaAnswer,
          captchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "No se pudo procesar la solicitud.",
        };
      }

      setSubmittedEmail(formData.email);
      setSubmitSuccess(true);
      setIsCaptchaOpen(false);
      setFormData({
        nombre: "",
        email: "",
        whatsapp: "",
        nivel: "Inicial",
        objetivos: "",
        honeypot: "",
      });

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Error de conexión con el servidor. Intenta de nuevo.",
      };
    }
  };

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
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link
                href="/shop_estrellas"
                className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Shop Estrellas
              </Link>
            )}
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
            <a href="#videos" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Videos tutoriales
            </a>
            <a href="#clase-prueba" className="rounded-md px-3 py-2 text-xs text-white/85 hover:bg-white/10">
              Clase de prueba
            </a>
            {user && (
              <Link
                href="/shop_estrellas"
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Shop Estrellas
              </Link>
            )}
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

      <section id="videos" className="bg-[#202020]">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Videos tutoriales</h2>
              <p className="mt-2 text-sm text-white/75">
                Seleccion de los 3 videos mas populares del canal.
              </p>
            </div>
            <Link
              href="https://www.youtube.com/@efrendrums182"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/25 px-4 py-2 text-xs text-white hover:bg-white/10"
            >
              Ver canal completo
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {POPULAR_VIDEOS.map((video) => (
              <article key={video.id} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <p className="mt-3 text-sm text-white/90">{video.title}</p>
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

          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-green-500/30 bg-[#1a1a1a] p-8 text-center shadow-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-9 w-9"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Solicitud Enviada con Éxito!</h3>
              <p className="rounded-lg bg-[#242424] p-4 text-sm font-medium leading-relaxed text-green-300 border border-green-500/20 mb-4 max-w-md">
                "Gracias por estar interesado en la clase de prueba en breve responderemos con la fecha para que te presentes en la clase de prueba"
              </p>
              <p className="text-xs text-white/70 mb-6 max-w-sm">
                Hemos enviado un correo de confirmación a <span className="font-semibold text-white">{submittedEmail}</span>. También nos pondremos en contacto contigo vía WhatsApp.
              </p>
              <button
                type="button"
                onClick={() => setSubmitSuccess(false)}
                className="rounded-lg border border-white/20 bg-[#262626] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#333] transition-colors"
              >
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            <form onSubmit={handleOpenCaptcha} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 shadow-lg">
              {/* Honeypot anti-bots */}
              <input
                type="text"
                name="website_url_check"
                value={formData.honeypot}
                onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
                style={{ display: "none", position: "absolute", left: "-9999px" }}
                aria-hidden="true"
              />

              <div className="grid gap-3">
                <div>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value });
                      if (formErrors.nombre) setFormErrors({ ...formErrors, nombre: "" });
                    }}
                    placeholder="Nombre completo *"
                    className={`w-full rounded-md border ${
                      formErrors.nombre ? "border-red-500" : "border-white/15"
                    } bg-[#262626] px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-red-500 focus:outline-none`}
                  />
                  {formErrors.nombre && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                    }}
                    placeholder="Correo electrónico *"
                    className={`w-full rounded-md border ${
                      formErrors.email ? "border-red-500" : "border-white/15"
                    } bg-[#262626] px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-red-500 focus:outline-none`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      setFormData({ ...formData, whatsapp: e.target.value });
                      if (formErrors.whatsapp) setFormErrors({ ...formErrors, whatsapp: "" });
                    }}
                    placeholder="WhatsApp (ej. 6621234567) *"
                    className={`w-full rounded-md border ${
                      formErrors.whatsapp ? "border-red-500" : "border-white/15"
                    } bg-[#262626] px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-red-500 focus:outline-none`}
                  />
                  {formErrors.whatsapp && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.whatsapp}</p>
                  )}
                </div>

                <div>
                  <select
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    className="w-full rounded-md border border-white/15 bg-[#262626] px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="Inicial">Nivel: Inicial (Principiante desde cero)</option>
                    <option value="Intermedio">Nivel: Intermedio (Con bases o autodidacta)</option>
                    <option value="Avanzado">Nivel: Avanzado (Técnica y velocidad)</option>
                  </select>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={formData.objetivos}
                    onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                    placeholder="Horario preferido y qué te gustaría aprender (opcional)"
                    className="w-full rounded-md border border-white/15 bg-[#262626] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-1 flex items-center justify-center gap-2 rounded-md bg-[#ff0000] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d10000] active:scale-[0.99] transition-all cursor-pointer shadow-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Quiero mi clase de prueba
                </button>
                <p className="text-center text-[11px] text-white/50">
                  🔒 Con verificación de seguridad anti-spam. Te responderemos en menos de 24h.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      <CaptchaModal
        isOpen={isCaptchaOpen}
        onClose={() => setIsCaptchaOpen(false)}
        onSuccess={handleCaptchaSuccess}
      />
    </div>
  );
}
