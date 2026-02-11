-- Tabla alumnos para Tienda Estrellas Efrendrums
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

-- Habilitar RLS (Row Level Security) y política para permitir todo desde anon (ajusta en producción)
alter table public.alumnos enable row level security;

create policy "Allow all for anon" on public.alumnos
  for all
  using (true)
  with check (true);
