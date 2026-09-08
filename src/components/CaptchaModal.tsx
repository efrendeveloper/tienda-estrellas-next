"use client";

import React, { useState, useEffect, useRef } from "react";

interface CaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (captchaAnswer: string, captchaToken: string) => Promise<{ success: boolean; error?: string }>;
}

export function CaptchaModal({ isOpen, onClose, onSuccess }: CaptchaModalProps) {
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchNewCaptcha = async () => {
    setIsLoadingCaptcha(true);
    setErrorMessage("");
    setUserInput("");
    try {
      const res = await fetch("/api/captcha");
      if (!res.ok) throw new Error("Error al obtener captcha");
      const data = await res.json();
      setCaptchaSvg(data.svg);
      setCaptchaToken(data.token);
    } catch (err) {
      setErrorMessage("No se pudo cargar la verificación. Revisa tu conexión.");
    } finally {
      setIsLoadingCaptcha(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNewCaptcha();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSubmitting) {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) {
      setErrorMessage("Por favor, introduce el código de la imagen.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await onSuccess(userInput.trim(), captchaToken);
      if (!result.success) {
        setErrorMessage(result.error || "Código incorrecto. Intenta de nuevo.");
        fetchNewCaptcha();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar. Intenta nuevamente.");
      fetchNewCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#181818] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Verificación de Seguridad</h3>
              <p className="text-xs text-white/60">Protección contra spam y bots</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <p className="text-sm text-white/80">
            Escribe los caracteres que ves en la imagen a continuación para confirmar tu solicitud:
          </p>

          {/* Contenedor del Captcha SVG */}
          <div className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#121212] p-3">
            {isLoadingCaptcha ? (
              <div className="flex h-[70px] w-[200px] items-center justify-center text-sm text-white/50">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent mr-2" />
                Cargando...
              </div>
            ) : captchaSvg ? (
              <div
                className="overflow-hidden rounded-lg shadow-inner select-none"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
              />
            ) : (
              <div className="flex h-[70px] w-[200px] items-center justify-center text-xs text-red-400">
                Error al cargar imagen
              </div>
            )}

            <button
              type="button"
              onClick={fetchNewCaptcha}
              disabled={isLoadingCaptcha || isSubmitting}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#262626] text-white/80 hover:bg-[#333] hover:text-white transition-colors disabled:opacity-50"
              title="Generar otro código"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${isLoadingCaptcha ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Entrada del usuario */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Código de la imagen (sin distinguir mayúsculas)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.toUpperCase())}
              placeholder="Escribe el código aquí"
              maxLength={6}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-white/20 bg-[#242424] px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white uppercase placeholder:text-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 rounded-lg border border-white/15 bg-[#262626] py-2.5 text-sm font-semibold text-white/80 hover:bg-[#333] hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !userInput.trim()}
              className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verificando...
                </>
              ) : (
                "Confirmar Solicitud"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
