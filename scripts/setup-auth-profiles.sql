-- Copia de supabase/migrations/002_profiles_and_rls.sql — ejecutar en Supabase → SQL Editor.

-- Perfiles con rol (admin = profesor, collaborator = ayudante, viewer = solo lectura en UI)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'collaborator', 'viewer')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Fila de perfil al registrarse (rol viewer por defecto; el admin cambia a admin/collaborator en Table Editor o SQL)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quién puede editar alumnos (insert/update/delete)
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

-- Reemplazar política permisiva de alumnos
drop policy if exists "Allow all for anon" on public.alumnos;

drop policy if exists "alumnos_select_all" on public.alumnos;
create policy "alumnos_select_all" on public.alumnos
  for select using (true);

drop policy if exists "alumnos_insert_editors" on public.alumnos;
create policy "alumnos_insert_editors" on public.alumnos
  for insert with check (public.is_alumnos_editor());

drop policy if exists "alumnos_update_editors" on public.alumnos;
create policy "alumnos_update_editors" on public.alumnos
  for update using (public.is_alumnos_editor());

drop policy if exists "alumnos_delete_editors" on public.alumnos;
drop policy if exists "alumnos_delete_admin" on public.alumnos;
create policy "alumnos_delete_admin" on public.alumnos
  for delete using (public.is_alumnos_admin());
