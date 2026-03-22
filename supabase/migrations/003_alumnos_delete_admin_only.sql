-- Si ya aplicaste 002 con borrado para admin+colaborador, esto deja delete solo para admin.

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

drop policy if exists "alumnos_delete_editors" on public.alumnos;
drop policy if exists "alumnos_delete_admin" on public.alumnos;

create policy "alumnos_delete_admin" on public.alumnos
  for delete using (public.is_alumnos_admin());
