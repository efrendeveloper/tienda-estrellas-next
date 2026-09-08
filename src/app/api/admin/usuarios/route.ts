import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCaptcha } from "@/lib/captcha";
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

/**
 * GET: Obtener lista de usuarios registrados con sus perfiles y alumnos vinculados
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin() || getSupabaseAnon();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no está configurado en las variables de entorno." },
        { status: 500 }
      );
    }

    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("id, email, username, role, alumno_id, updated_at")
      .order("updated_at", { ascending: false });

    if (pError) {
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    // Obtener nombres de alumnos para vincular visualmente
    const { data: alumnos } = await supabase
      .from("alumnos")
      .select("id, nombre, monedas, estrellas");

    const alumnosMap = new Map((alumnos || []).map((a) => [a.id, a]));

    const usersWithAlumno = (profiles || []).map((p) => {
      const alumno = p.alumno_id ? alumnosMap.get(p.alumno_id) : null;
      return {
        id: p.id,
        email: p.email,
        username: p.username || p.email?.split("@")[0] || "Sin usuario",
        role: p.role,
        alumnoId: p.alumno_id,
        alumnoNombre: alumno?.nombre ?? null,
        alumnoMonedas: alumno?.monedas ?? 0,
        alumnoEstrellas: alumno?.estrellas ?? 0,
        updatedAt: p.updated_at,
      };
    });

    return NextResponse.json({ users: usersWithAlumno }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error al obtener usuarios:", err);
    return NextResponse.json(
      { error: "Error interno al obtener usuarios." },
      { status: 500 }
    );
  }
}

/**
 * POST: Dar de alta un nuevo usuario con Nombre de Usuario, Contraseña, Captcha, Rol y Alumno Vinculado
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      password,
      confirmPassword,
      role,
      alumnoId,
      captchaToken,
      captchaAnswer,
    } = body;

    // 1. Verificación de Captcha
    if (!captchaToken || !captchaAnswer) {
      return NextResponse.json(
        { error: "Debes completar la verificación de seguridad (Captcha)." },
        { status: 400 }
      );
    }

    const isCaptchaValid = verifyCaptcha(captchaAnswer, captchaToken);
    if (!isCaptchaValid) {
      return NextResponse.json(
        {
          error:
            "El código Captcha es incorrecto o ha caducado. Por favor, escribe el código actualizado.",
        },
        { status: 400 }
      );
    }

    // 2. Validación de campos básicos
    const rawUsername = String(username || "").trim();
    if (!rawUsername || rawUsername.length < 3) {
      return NextResponse.json(
        { error: "El nombre de usuario debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    // No permitir espacios en el nombre de usuario
    if (/\s/.test(rawUsername)) {
      return NextResponse.json(
        { error: "El nombre de usuario no puede contener espacios." },
        { status: 400 }
      );
    }

    const rawPassword = String(password || "");
    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (rawPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "collaborator", "user"];
    const targetRole = validRoles.includes(role) ? role : "user";

    // Si es rol user, se recomienda alumno_id
    const targetAlumnoId = alumnoId ? String(alumnoId) : null;

    // 3. Determinar el correo para Supabase Auth
    const email = rawUsername.includes("@")
      ? rawUsername.toLowerCase()
      : `${rawUsername.toLowerCase()}@academia.efrendrums.local`;

    // 4. Crear usuario en Supabase
    const adminClient = getSupabaseAdmin();

    if (adminClient) {
      // Método recomendado: Admin API de Supabase (sin desloguear al admin y confirmando email)
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email,
          password: rawPassword,
          email_confirm: true,
          user_metadata: {
            username: rawUsername,
            role: targetRole,
            alumno_id: targetAlumnoId,
          },
        });

      if (authError) {
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already exists")
        ) {
          return NextResponse.json(
            { error: `El usuario o correo "${rawUsername}" ya está registrado.` },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const newUserId = authData.user.id;

      // Insertar o actualizar el perfil
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: newUserId,
          email,
          username: rawUsername,
          role: targetRole as "admin" | "collaborator" | "user",
          alumno_id: targetAlumnoId,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn("Aviso al crear profile:", profileError.message);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Usuario "${rawUsername}" creado exitosamente con rol ${targetRole}.`,
          userId: newUserId,
        },
        { status: 201 }
      );
    } else {
      // Fallback si SUPABASE_SERVICE_ROLE_KEY no está configurada aún en .env.local
      // Usamos cliente anon ephemeral para signUp
      const anonClient = getSupabaseAnon();
      if (!anonClient) {
        return NextResponse.json(
          { error: "Supabase no está configurado." },
          { status: 500 }
        );
      }

      const { data: authData, error: authError } = await anonClient.auth.signUp({
        email,
        password: rawPassword,
        options: {
          data: {
            username: rawUsername,
            role: targetRole,
            alumno_id: targetAlumnoId,
          },
        },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      if (authData.user) {
        await anonClient.from("profiles").upsert({
          id: authData.user.id,
          email,
          username: rawUsername,
          role: targetRole as "admin" | "collaborator" | "user",
          alumno_id: targetAlumnoId,
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: `Usuario "${rawUsername}" dado de alta. (Nota: Añade SUPABASE_SERVICE_ROLE_KEY en .env.local para alta instantánea sin confirmación de email).`,
          userId: authData.user?.id,
        },
        { status: 201 }
      );
    }
  } catch (err: unknown) {
    console.error("Error al crear usuario:", err);
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "Error desconocido al procesar el alta de usuario.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE: Eliminar un usuario por ID
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta el ID del usuario." }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      await adminClient.auth.admin.deleteUser(id);
      await adminClient.from("profiles").delete().eq("id", id);
      return NextResponse.json({ success: true, message: "Usuario eliminado." });
    } else {
      const anonClient = getSupabaseAnon();
      if (!anonClient) {
        return NextResponse.json({ error: "Supabase no configurado." }, { status: 500 });
      }
      await anonClient.from("profiles").delete().eq("id", id);
      return NextResponse.json({
        success: true,
        message: "Perfil de usuario eliminado (para borrar credenciales Auth añade SUPABASE_SERVICE_ROLE_KEY).",
      });
    }
  } catch (err: unknown) {
    console.error("Error al eliminar usuario:", err);
    return NextResponse.json({ error: "Error al eliminar usuario." }, { status: 500 });
  }
}
