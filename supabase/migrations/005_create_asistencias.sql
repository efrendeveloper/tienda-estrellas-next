-- Registro de asistencia por alumno y fecha.
-- Fallback: crea helpers de permisos si no existen todavía en esta BD.
create or replace function public.is_alumnos_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'collaborator')
  );
$$;

create or replace function public.is_alumnos_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create table if not exists public.asistencias (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  fecha date not null,
  estado text check (estado in ('present', 'absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alumno_id, fecha)
);

alter table public.asistencias enable row level security;

drop policy if exists "asistencias_select_all" on public.asistencias;
create policy "asistencias_select_all" on public.asistencias
  for select using (true);

drop policy if exists "asistencias_insert_editors" on public.asistencias;
create policy "asistencias_insert_editors" on public.asistencias
  for insert with check (public.is_alumnos_editor());

drop policy if exists "asistencias_update_editors" on public.asistencias;
create policy "asistencias_update_editors" on public.asistencias
  for update using (public.is_alumnos_editor());

drop policy if exists "asistencias_delete_admin" on public.asistencias;
create policy "asistencias_delete_admin" on public.asistencias
  for delete using (public.is_alumnos_admin());

create or replace function public.set_asistencias_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_asistencias_updated_at on public.asistencias;
create trigger trg_asistencias_updated_at
before update on public.asistencias
for each row execute function public.set_asistencias_updated_at();
