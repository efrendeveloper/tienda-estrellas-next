-- ============================================================
-- Migración: crear tabla alumnos para Tienda Estrellas Efrendrums
-- Ejecuta este script en Supabase → SQL Editor → New query
-- ============================================================

-- Tabla alumnos (monedas, estrellas, maxi, ultra, hongos, caja sorpresa, luna, pow, cerezas, hongo_gold, key, rayo, red_coin, cube_yellow)
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
  pow int not null default 0,
  cerezas int not null default 0,
  hongo_gold int not null default 0,
  key int not null default 0,
  rayo int not null default 0,
  red_coin int not null default 0,
  cube_yellow int not null default 0,
  created_at timestamptz not null default now()
);

-- Si la tabla ya existe, agregar las columnas necesarias
alter table public.alumnos add column if not exists cerezas int not null default 0;
alter table public.alumnos add column if not exists hongo_gold int not null default 0;
alter table public.alumnos add column if not exists key int not null default 0;
alter table public.alumnos add column if not exists rayo int not null default 0;
alter table public.alumnos add column if not exists red_coin int not null default 0;
alter table public.alumnos add column if not exists cube_yellow int not null default 0;

-- Habilitar RLS (Row Level Security)
alter table public.alumnos enable row level security;

-- Política: permitir todo para anon (ajusta en producción según autenticación)
drop policy if exists "Allow all for anon" on public.alumnos;
create policy "Allow all for anon" on public.alumnos
  for all
  using (true)
  with check (true);
