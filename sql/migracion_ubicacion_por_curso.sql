-- Cada curso tiene su propia ubicación (antes estaba en la institución y
-- al cambiarla se cambiaba en todos los cursos del representante).
-- (Con DB_SYNC=alter el servidor crea las columnas solo; este archivo sirve para otras bases.)

ALTER TABLE cursos
  ADD COLUMN ubicacion_maps TEXT NULL,
  ADD COLUMN latitud DECIMAL(10,7) NULL,
  ADD COLUMN longitud DECIMAL(10,7) NULL;

-- Opcional: copia a cada curso la ubicación que tenía su institución,
-- así los cursos existentes conservan el lugar que ya mostraban.
UPDATE cursos c
JOIN instituciones i ON i.id = c.institucion_id
SET c.ubicacion_maps = i.ubicacion_maps,
    c.latitud = i.latitud,
    c.longitud = i.longitud
WHERE c.ubicacion_maps IS NULL AND c.latitud IS NULL;
