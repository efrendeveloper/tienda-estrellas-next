import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const captcha = generateCaptcha();
    return NextResponse.json(captcha, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error al generar captcha:", error);
    return NextResponse.json(
      { error: "Error al generar verificación de seguridad" },
      { status: 500 }
    );
  }
}
