-- Motivo por el que un alumno se da de baja de un curso.
-- Sólo hace falta correrlo si la base NO usa DB_SYNC=alter o DB_SYNC=force
-- (en esos modos Sequelize agrega las columnas solo al iniciar el servidor).
ALTER TABLE inscripciones
  ADD COLUMN motivo_baja VARCHAR(100) NULL,
  ADD COLUMN comentario_baja TEXT NULL,
  ADD COLUMN fecha_baja DATETIME NULL;
