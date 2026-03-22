# Tienda Estrellas Efrendrums (Next.js + TypeScript + Supabase)

Versión migrada de la tienda de estrellas a **Next.js 15**, **TypeScript** y **Supabase** para persistencia de datos.

## Funcionalidades

- **Inicio (/)**  
  Gestión de alumnos: agregar alumnos, ver sus ítems (monedas, estrellas, maxi, ultra, hongos, caja sorpresa, luna). Clic para sumar, clic derecho para restar. En **Caja Sorpresa**, mantener pulsado 3 segundos para abrir la ruleta (cuesta 1 moneda + 1 caja) y obtener un premio aleatorio.

- **Tienda (/tienda)**  
  Seleccionar alumno y comprar ítems con monedas: Estrella, Maxi Estrella, Ultra Estrella, Hongo 1-UP, Caja Sorpresa, Luna, POW.

- **Sesión (esquina superior derecha)**  
  - **Sin iniciar sesión** o con rol **viewer**: solo se ven alumnos e ítems (modo padres / visitantes). No se puede editar ni comprar.  
  - **Administrador** (`admin`) o **colaborador** (`collaborator`): pueden agregar alumnos, modificar contadores, usar la ruleta y comprar en la tienda.

## Configuración

### 1. Variables de entorno

Copia el ejemplo y rellena con tu proyecto Supabase:

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto (Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anónima (anon public).

### 2. Base de datos en Supabase

En el **SQL Editor** de Supabase, ejecuta el contenido de:

```
supabase/migrations/001_create_alumnos.sql
```

O ejecuta directamente:

```sql
create table if not exists public.alumnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monedas int not null default 0,
  estrellas int not null default 0,
  maxiestrellas int not null default 0,
  ultraestrellas int not null default 0,
  hongos int not null default 0,
  item_box int not null default 0,
  luna int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.alumnos enable row level security;

create policy "Allow all for anon" on public.alumnos
  for all using (true) with check (true);
```

(En producción conviene restringir la política según autenticación.)

**Comprobar:** En Supabase → Table Editor debe aparecer la tabla `alumnos`. Si la app muestra "Cargando..." sin datos o errores al guardar, ejecuta la migración anterior en SQL Editor.

Si tu tabla ya existe pero te falta la columna `pow`:

```sql
alter table public.alumnos add column if not exists pow int not null default 0;
```

### 3. Perfiles, login y permisos (RLS)

1. En Supabase → **Authentication** → **Providers**, activa **Email** (correo + contraseña).
2. En el **SQL Editor**, ejecuta el contenido de:

   - `supabase/migrations/002_profiles_and_rls.sql`  
   - o `scripts/setup-auth-profiles.sql` (mismo contenido).

   Esto crea la tabla `profiles`, el trigger al registrarse (rol por defecto `viewer`) y sustituye la política permisiva de `alumnos` por:
   - **lectura pública** (`select` para todos, incluidos visitantes sin login),
   - **escritura solo** si el usuario tiene en `profiles` el rol `admin` o `collaborator`.

3. Crea el usuario del profesor: **Authentication** → **Users** → **Add user** (o invita por correo).

4. Asigna rol de profesor o colaborador en **Table Editor** → `profiles`, o con SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'tu_correo@ejemplo.com';

-- Opcional: ayudante
update public.profiles
set role = 'collaborator'
where email = 'colaborador@ejemplo.com';
```

5. Si ya tenías usuarios en **Auth** antes del trigger, crea su fila en `profiles`:

```sql
insert into public.profiles (id, email, role)
select id, email, 'viewer'
from auth.users
where id not in (select id from public.profiles);
```

Luego cambia a `admin` o `collaborator` los que correspondan.

### 4. Instalación y ejecución

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

- `src/app/page.tsx` — Página principal (gestión de alumnos y ruleta).
- `src/app/tienda/page.tsx` — Tienda (compras con monedas).
- `src/contexts/AuthContext.tsx` — Sesión Supabase y rol (`canEdit`).
- `src/components/AuthMenu.tsx` — Menú “Iniciar sesión” / “Cerrar sesión”.
- `src/lib/supabase.ts` — Cliente de Supabase.
- `src/types/index.ts` — Tipos y listas de ítems.
- `public/image/` — Imágenes de ítems; `public/` — logo y sonidos.
