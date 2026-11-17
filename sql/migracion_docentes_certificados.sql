-- Equipo docente de cada curso y certificados emitidos por la institución.
-- (Con DB_SYNC=alter el servidor lo aplica solo; este archivo sirve para otras bases.)

-- 1) Docentes que dictan cada curso (se muestran en la página del curso)
CREATE TABLE IF NOT EXISTS docentes_curso (
  id INT NOT NULL AUTO_INCREMENT,
  curso_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(100) NOT NULL DEFAULT 'Profesor',
  biografia TEXT NULL,
  foto_url VARCHAR(255) NULL,
  orden INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_docentes_curso_curso FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2) El certificado ya no se genera solo: lo emite (y puede anular) el representante
ALTER TABLE certificados
  ADD COLUMN emitido_por INT NULL,
  ADD COLUMN anulado TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN fecha_anulacion DATETIME NULL,
  ADD CONSTRAINT fk_certificados_emisor FOREIGN KEY (emitido_por) REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE;
