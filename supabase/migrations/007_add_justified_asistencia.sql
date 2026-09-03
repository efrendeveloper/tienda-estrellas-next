-- Migration 007: Permitir estado 'justified' (falta justificada) en tabla asistencias
alter table public.asistencias drop constraint if exists asistencias_estado_check;
alter table public.asistencias add constraint asistencias_estado_check check (estado in ('present', 'absent', 'justified'));
