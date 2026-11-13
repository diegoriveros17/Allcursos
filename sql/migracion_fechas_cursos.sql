-- Fechas de cursado de cada curso (opcionales).
-- Sólo hace falta correrlo si la base NO usa DB_SYNC=alter o DB_SYNC=force,
-- porque en esos modos Sequelize agrega las columnas solo al iniciar el servidor.
ALTER TABLE cursos
  ADD COLUMN fecha_inicio DATE NULL AFTER modalidad,
  ADD COLUMN fecha_fin DATE NULL AFTER fecha_inicio;
