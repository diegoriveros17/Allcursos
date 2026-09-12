-- ============================================================
-- MIGRACIÓN: likes ligados a la cuenta + foto de perfil
-- ============================================================

-- 1. Foto de perfil de la persona (ciudadano o representante)
ALTER TABLE personas
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER telefono;

-- 2. Tabla de "me gusta": ahora ligados a la cuenta (no anónimos),
--    un usuario sólo puede dar like una vez por curso.
CREATE TABLE IF NOT EXISTS curso_likes (
  id INT NOT NULL AUTO_INCREMENT,
  curso_id INT NOT NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curso_usuario_like (curso_id, usuario_id),
  KEY idx_curso_likes_usuario (usuario_id),
  CONSTRAINT curso_likes_ibfk_1 FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT curso_likes_ibfk_2 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nota: si en una versión anterior llegaste a correr "migracion_likes.sql"
-- (el contador anónimo), la columna cursos.likes_count sigue existiendo y
-- se sigue usando -- ahora simplemente queda respaldada por esta tabla en
-- vez de incrementarse/decrementarse sin control.
