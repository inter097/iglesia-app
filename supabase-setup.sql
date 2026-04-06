-- Tabla principal de canciones
create table songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  key text,
  speed text check (speed in ('rapida', 'intermedia', 'lenta')),
  bpm text,
  content text,
  is_mvi boolean default false,
  is_nashville boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índice para búsqueda por título
create index songs_title_idx on songs using gin(to_tsvector('spanish', title));

-- Cualquiera puede leer
alter table songs enable row level security;

create policy "Lectura pública" on songs
  for select using (true);

create policy "Solo admin puede insertar" on songs
  for insert with check (auth.role() = 'authenticated');

create policy "Solo admin puede actualizar" on songs
  for update using (auth.role() = 'authenticated');

create policy "Solo admin puede eliminar" on songs
  for delete using (auth.role() = 'authenticated');

-- Actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at
  before update on songs
  for each row execute function update_updated_at();
