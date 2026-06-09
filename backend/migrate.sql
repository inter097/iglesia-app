-- Agregar is_post_message a setlist_songs
ALTER TABLE iglesia.setlist_songs
    ADD COLUMN IF NOT EXISTS is_post_message BOOLEAN DEFAULT FALSE;

-- Tabla de snapshots (una foto por servicio con fecha)
CREATE TABLE IF NOT EXISTS iglesia.setlist_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day         TEXT NOT NULL,          -- 'domingo', 'miercoles', 'sabado'
    service_date DATE NOT NULL,         -- fecha del servicio
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (day, service_date)
);

-- Canciones del snapshot
CREATE TABLE IF NOT EXISTS iglesia.setlist_snapshot_songs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id     UUID REFERENCES iglesia.setlist_snapshots(id) ON DELETE CASCADE,
    song_id         UUID REFERENCES iglesia.songs(id),
    position        INTEGER,
    transpose       INTEGER DEFAULT 0,
    is_post_message BOOLEAN DEFAULT FALSE
);
