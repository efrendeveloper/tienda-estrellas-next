-- Promueve usuarios activos específicos a collaborator.
-- collaborator mantiene permisos de edición y reportes, pero no puede borrar alumnos.

update public.profiles
set role = 'collaborator'
where lower(email) in (
  'eliasbalderramab@gmail.com',
  'angelbalderrama.cb206@gmail.com'
);
