# Tienda Estrellas Efrendrums (Next.js + TypeScript + Supabase)

Versión migrada de la tienda de estrellas a **Next.js 15**, **TypeScript** y **Supabase** para persistencia de datos.

## Funcionalidades

- **Inicio (/)**  
  Gestión de alumnos: agregar alumnos, ver sus ítems (monedas, estrellas, maxi, ultra, hongos, caja sorpresa, luna). Clic para sumar, clic derecho para restar. En **Caja Sorpresa**, mantener pulsado 3 segundos para abrir la ruleta (cuesta 1 moneda + 1 caja) y obtener un premio aleatorio.

- **Tienda (/tienda)**  
  Seleccionar alumno y comprar ítems con monedas: Estrella, Maxi Estrella, Ultra Estrella, Hongo 1-UP, Caja Sorpresa, Luna.

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

### 3. Instalación y ejecución

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

- `src/app/page.tsx` — Página principal (gestión de alumnos y ruleta).
- `src/app/tienda/page.tsx` — Tienda (compras con monedas).
- `src/lib/supabase.ts` — Cliente de Supabase.
- `src/types/index.ts` — Tipos y listas de ítems.
- `public/image/` — Imágenes de ítems; `public/` — logo y sonidos.
