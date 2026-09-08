import { NextResponse } from "next/server";
import { verifyCaptcha } from "@/lib/captcha";
import { sendClasePruebaEmails } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      nombre,
      email,
      whatsapp,
      nivel,
      objetivos,
      honeypot,
      captchaToken,
      captchaAnswer,
    } = body;

    // 1. Protección Honeypot (trampa para bots automatizados)
    if (honeypot && String(honeypot).trim().length > 0) {
      console.warn("Intento de spam detectado mediante honeypot:", { honeypot });
      return NextResponse.json(
        { success: true, message: "Solicitud procesada correctamente" },
        { status: 200 }
      );
    }

    // 2. Validación de Captcha
    if (!captchaToken || !captchaAnswer) {
      return NextResponse.json(
        { success: false, error: "Debes completar la verificación de seguridad (Captcha)." },
        { status: 400 }
      );
    }

    const isCaptchaValid = verifyCaptcha(captchaAnswer, captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        {
          success: false,
          error: "El código de seguridad ingresado es incorrecto o ha caducado. Por favor, escribe el nuevo código mostrado.",
        },
        { status: 400 }
      );
    }

    // 3. Validación de campos obligatorios
    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Por favor, introduce tu nombre completo." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return NextResponse.json(
        { success: false, error: "Por favor, introduce un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (!whatsapp || String(whatsapp).trim().length < 7) {
      return NextResponse.json(
        { success: false, error: "Por favor, introduce un número de WhatsApp de contacto." },
        { status: 400 }
      );
    }

    // 4. Envío de correos
    await sendClasePruebaEmails({
      nombre: nombre.trim(),
      email: email.trim(),
      whatsapp: String(whatsapp).trim(),
      nivel: nivel || "No especificado",
      objetivos: objetivos ? String(objetivos).trim() : "",
    });

    return NextResponse.json({
      success: true,
      message:
        "¡Solicitud enviada con éxito! Te hemos enviado un correo de confirmación y nos comunicaremos muy pronto.",
    });
  } catch (error: any) {
    console.error("Error al procesar solicitud de clase de prueba:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error inesperado al procesar tu solicitud. Por favor, intenta de nuevo o escríbenos directamente por WhatsApp.",
      },
      { status: 500 }
    );
  }
}
