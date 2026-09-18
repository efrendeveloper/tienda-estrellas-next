import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SHOP_ITEMS } from "@/types";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { alumnoId, itemId, userId, userRole, userAlumnoId } = body;

    if (!alumnoId || !itemId) {
      return NextResponse.json(
        { error: "Faltan parámetros de la compra (alumno o ítem)." },
        { status: 400 }
      );
    }

    const item = SHOP_ITEMS.find((it) => it.id === itemId);
    if (!item) {
      return NextResponse.json(
        { error: "El ítem seleccionado no existe en la tienda." },
        { status: 400 }
      );
    }

    // Seguridad de roles: si es 'user' o 'viewer' (alumno vinculado), solo puede comprar para SU propio alumno_id
    if (userRole === "user" || userRole === "viewer") {
      if (!userAlumnoId || userAlumnoId !== alumnoId) {
        return NextResponse.json(
          { error: "No tienes permiso para comprar con las monedas de otro alumno." },
          { status: 403 }
        );
      }
    } else if (userRole !== "admin" && userRole !== "collaborator") {
      // Visitante no autenticado
      return NextResponse.json(
        { error: "Debes iniciar sesión para comprar en la tienda." },
        { status: 403 }
      );
    }

    // Cliente para base de datos
    const supabase = getSupabaseAdmin() || getSupabaseAnon();
    if (!supabase) {
      return NextResponse.json(
        { error: "Error de configuración del servidor." },
        { status: 500 }
      );
    }

    // Obtener estado actual del alumno
    const { data: alumno, error: fetchError } = await supabase
      .from("alumnos")
      .select("*")
      .eq("id", alumnoId)
      .single();

    if (fetchError || !alumno) {
      return NextResponse.json(
        { error: "Alumno no encontrado." },
        { status: 404 }
      );
    }

    // Validar saldo
    const monedasActuales = alumno.monedas ?? 0;
    if (monedasActuales < item.price) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Tienes ${monedasActuales} monedas y el ítem cuesta ${item.price}.`,
        },
        { status: 400 }
      );
    }

    // Calcular nuevos valores
    const nuevasMonedas = Math.max(0, monedasActuales - item.price);
    const cantidadActualItem = (alumno[item.key] as number) ?? 0;
    const nuevaCantidadItem = cantidadActualItem + 1;

    type Update = Database["public"]["Tables"]["alumnos"]["Update"];
    const payload: Update = {
      monedas: nuevasMonedas,
      [item.key]: nuevaCantidadItem,
    };

    const { error: updateError } = await supabase
      .from("alumnos")
      .update(payload)
      .eq("id", alumnoId);

    if (updateError) {
      return NextResponse.json(
        { error: `Error al procesar compra: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `¡Compra realizada exitosamente! Has obtenido ${item.title}.`,
      itemTitle: item.title,
      nuevasMonedas,
      itemKey: item.key,
      nuevaCantidadItem,
    });
  } catch (err: unknown) {
    console.error("Error en endpoint de compra:", err);
    return NextResponse.json(
      { error: "Error interno al procesar la compra." },
      { status: 500 }
    );
  }
}
