-- Migration 006: Add new items (hongo_gold, key, rayo, red_coin, cube_yellow) to alumnos table
alter table public.alumnos add column if not exists hongo_gold int not null default 0;
alter table public.alumnos add column if not exists key int not null default 0;
alter table public.alumnos add column if not exists rayo int not null default 0;
alter table public.alumnos add column if not exists red_coin int not null default 0;
alter table public.alumnos add column if not exists cube_yellow int not null default 0;
