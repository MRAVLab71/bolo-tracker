create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.bolos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default '',
  cliente text,
  ubicacion text,
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'abierto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_bolos_updated_at on public.bolos;
create trigger trg_bolos_updated_at
before update on public.bolos
for each row execute procedure public.set_updated_at();

create table if not exists public.jornadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bolo_id uuid not null references public.bolos(id) on delete cascade,
  fecha date not null,
  entrada time,
  salida time,
  descanso_min int not null default 0,
  je int not null default 0,
  noct int not null default 0,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_jornadas_updated_at on public.jornadas;
create trigger trg_jornadas_updated_at
before update on public.jornadas
for each row execute procedure public.set_updated_at();

alter table public.bolos enable row level security;
alter table public.jornadas enable row level security;

drop policy if exists "bolos_select_own" on public.bolos;
create policy "bolos_select_own" on public.bolos for select using (auth.uid() = user_id);

drop policy if exists "bolos_insert_own" on public.bolos;
create policy "bolos_insert_own" on public.bolos for insert with check (auth.uid() = user_id);

drop policy if exists "bolos_update_own" on public.bolos;
create policy "bolos_update_own" on public.bolos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bolos_delete_own" on public.bolos;
create policy "bolos_delete_own" on public.bolos for delete using (auth.uid() = user_id);

drop policy if exists "jornadas_select_own" on public.jornadas;
create policy "jornadas_select_own" on public.jornadas for select using (auth.uid() = user_id);

drop policy if exists "jornadas_insert_own" on public.jornadas;
create policy "jornadas_insert_own" on public.jornadas for insert with check (auth.uid() = user_id);

drop policy if exists "jornadas_update_own" on public.jornadas;
create policy "jornadas_update_own" on public.jornadas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jornadas_delete_own" on public.jornadas;
create policy "jornadas_delete_own" on public.jornadas for delete using (auth.uid() = user_id);
