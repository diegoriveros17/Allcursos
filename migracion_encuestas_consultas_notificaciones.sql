-- ============================================================
-- MIGRACIÓN v2.1: encuestas dinámicas + consultas públicas + campanita
-- Ejecutar UNA vez sobre una BD existente (MySQL 5.7+ / MariaDB 10.3+).
-- Si usás DB_SYNC=force (el comportamiento por defecto) Sequelize ya crea
-- todo esto solo y NO necesitás este script.
-- ============================================================

-- 1. Texto de presentación opcional de la encuesta
ALTER TABLE encuestas
  ADD COLUMN descripcion TEXT NULL AFTER titulo;

-- 2. Preguntas de cada encuesta (selección múltiple / texto abierto / rating)
CREATE TABLE IF NOT EXISTS encuestas_preguntas (
  id INT NOT NULL AUTO_INCREMENT,
  encuesta_id INT NOT NULL,
  texto VARCHAR(300) NOT NULL,
  tipo ENUM('opcion_multiple','texto_abierto','rating') NOT NULL,
  opciones TEXT NULL,                       -- JSON: ["Bueno","Regular","Malo"]
  escala_max INT NOT NULL DEFAULT 5,        -- sólo para tipo = 'rating'
  permite_justificacion TINYINT(1) NOT NULL DEFAULT 0,
  obligatoria TINYINT(1) NOT NULL DEFAULT 1,
  orden INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_preguntas_encuesta (encuesta_id),
  CONSTRAINT fk_preguntas_encuesta FOREIGN KEY (encuesta_id) REFERENCES encuestas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Respuesta a cada pregunta (la cabecera sigue siendo encuestas_respuestas)
CREATE TABLE IF NOT EXISTS encuestas_respuestas_detalle (
  id INT NOT NULL AUTO_INCREMENT,
  respuesta_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  valor_opcion VARCHAR(150) NULL,
  valor_rating INT NULL,
  valor_texto TEXT NULL,
  justificacion TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_respuesta_pregunta (respuesta_id, pregunta_id),
  KEY idx_detalle_pregunta (pregunta_id),
  CONSTRAINT fk_detalle_respuesta FOREIGN KEY (respuesta_id) REFERENCES encuestas_respuestas (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_pregunta FOREIGN KEY (pregunta_id) REFERENCES encuestas_preguntas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Una persona responde una sola vez cada encuesta.
--    (Si falla por duplicados, borrá primero las respuestas repetidas.)
ALTER TABLE encuestas_respuestas
  ADD UNIQUE KEY uq_encuesta_persona (encuesta_id, persona_id);

-- 5. Encuestas viejas (una sola pregunta de texto libre) -> se convierten
--    en una pregunta "texto_abierto" para que sigan viéndose en las estadísticas.
INSERT INTO encuestas_preguntas (encuesta_id, texto, tipo, orden)
SELECT e.id, e.titulo, 'texto_abierto', 0
FROM encuestas e
WHERE NOT EXISTS (SELECT 1 FROM encuestas_preguntas p WHERE p.encuesta_id = e.id);

INSERT INTO encuestas_respuestas_detalle (respuesta_id, pregunta_id, valor_texto)
SELECT r.id, p.id, r.respuesta
FROM encuestas_respuestas r
JOIN encuestas_preguntas p ON p.encuesta_id = r.encuesta_id
WHERE r.respuesta IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM encuestas_respuestas_detalle d WHERE d.respuesta_id = r.id);

-- 6. Consultas de visitantes sobre un curso
CREATE TABLE IF NOT EXISTS consultas_curso (
  id INT NOT NULL AUTO_INCREMENT,
  curso_id INT NOT NULL,
  institucion_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  estado ENUM('nueva','leida','respondida') NOT NULL DEFAULT 'nueva',
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultas_institucion_estado (institucion_id, estado),
  KEY idx_consultas_curso (curso_id),
  CONSTRAINT fk_consultas_curso FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_consultas_institucion FOREIGN KEY (institucion_id) REFERENCES instituciones (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bandeja de notificaciones internas (campanita del navbar)
CREATE TABLE IF NOT EXISTS notificaciones_usuario (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo ENUM('consulta','encuesta_respuesta','encuesta_nueva','inscripcion','curso_nuevo','sistema') NOT NULL DEFAULT 'sistema',
  titulo VARCHAR(150) NOT NULL,
  mensaje VARCHAR(500) NULL,
  url VARCHAR(255) NULL,
  contador INT NOT NULL DEFAULT 1,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_usuario_leida (usuario_id, leida),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
