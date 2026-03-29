-- ============================================================
-- Migración: Soporte de media para anuncios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna cover_image_url a announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 2. Nueva tabla: announcement_media
CREATE TABLE IF NOT EXISTS announcement_media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_type       text NOT NULL,
  file_size       integer NOT NULL,
  storage_path    text NOT NULL,
  media_type      text NOT NULL CHECK (media_type IN ('image', 'video', 'document', 'embed')),
  embed_url       text,
  display_order   integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_media_announcement
  ON announcement_media(announcement_id, display_order);

-- 3. RLS para announcement_media
ALTER TABLE announcement_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AnnouncementMedia: lectura publica"
  ON announcement_media FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "AnnouncementMedia: insertar autenticado"
  ON announcement_media FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "AnnouncementMedia: actualizar autenticado"
  ON announcement_media FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "AnnouncementMedia: eliminar autenticado"
  ON announcement_media FOR DELETE TO authenticated USING (true);

-- 4. Bucket de storage (ejecutar por separado si no funciona aquí)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('announcement-media', 'announcement-media', true)
-- ON CONFLICT (id) DO NOTHING;

-- 5. Políticas de storage (ejecutar después de crear el bucket)
-- CREATE POLICY "Public read announcement media"
--   ON storage.objects FOR SELECT TO anon, authenticated
--   USING (bucket_id = 'announcement-media');
--
-- CREATE POLICY "Authenticated upload announcement media"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'announcement-media');
--
-- CREATE POLICY "Authenticated delete announcement media"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'announcement-media');
