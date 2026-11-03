-- ============================================================
-- MIGRACIÓN: consultas respondidas dentro de la plataforma (sin email)
-- Ejecutar UNA vez sobre una BD existente (MySQL 5.7+ / MariaDB 10.3+).
-- Si usás DB_SYNC=force o DB_SYNC=alter, Sequelize ya crea todo esto solo
-- y NO necesitás este script.
-- ============================================================

-- 1. Cada consulta queda asociada al ciudadano que la hizo (null = consulta vieja de visitante)
ALTER TABLE consultas_curso
  ADD COLUMN usuario_id INT NULL AFTER institucion_id,
  ADD COLUMN novedad_ciudadano TINYINT(1) NOT NULL DEFAULT 0 AFTER usuario_id,
  ADD KEY idx_consultas_usuario (usuario_id),
  ADD CONSTRAINT fk_consultas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Conversación de cada consulta (respuestas de la institución y repreguntas del ciudadano)
CREATE TABLE IF NOT EXISTS mensajes_consulta (
  id INT NOT NULL AUTO_INCREMENT,
  consulta_id INT NOT NULL,
  usuario_id INT NULL,
  autor ENUM('ciudadano','representante') NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_creacion DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_mensajes_consulta (consulta_id),
  CONSTRAINT fk_mensajes_consulta FOREIGN KEY (consulta_id) REFERENCES consultas_curso (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mensajes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
