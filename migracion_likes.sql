-- ============================================================
-- MIGRACIÓN: contador de "me gusta" por curso
-- ============================================================
ALTER TABLE cursos
  ADD COLUMN likes_count INT NOT NULL DEFAULT 0 AFTER imagen_url;
