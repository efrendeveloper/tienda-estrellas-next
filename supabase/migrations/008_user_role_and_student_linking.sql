-- Migración 008: Soporte para rol 'user' (alumnos), username y vinculación con alumnos

-- 1. Ampliar el check constraint en profiles para permitir 'user'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'collaborator', 'viewer', 'user'));

-- 2. Añadir columna username y alumno_id a profiles si no existen
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) then
    alter table public.profiles add column username text unique;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'alumno_id'
  ) then
    alter table public.profiles add column alumno_id uuid references public.alumnos(id) on delete set null;
  end if;
end $$;

-- 3. Índices para acelerar búsquedas
create index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_profiles_alumno_id on public.profiles (alumno_id);

-- 4. Actualizar políticas RLS de profiles:
-- Permitir lectura general de username/rol (o al menos por login lookup)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

-- Permitir que los administradores puedan actualizar perfiles (asignar rol / alumno)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_alumnos_admin());

-- Permitir que los administradores puedan insertar perfiles
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_alumnos_admin());
