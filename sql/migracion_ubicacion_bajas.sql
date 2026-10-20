-- ============================================================
-- MIGRACIÓN v2.2: ubicación de Google Maps + bajas de cuenta con feedback
-- Ejecutar UNA vez si tu BD ya tiene datos (con DB_SYNC=force no hace falta).
-- ============================================================

-- 1. Nueva columna en instituciones para guardar la ubicación de Google Maps
ALTER TABLE instituciones
  ADD COLUMN ubicacion_maps TEXT NULL; -- Texto con dirección, coordenadas o código de "Insertar un mapa"

-- 1b. Columnas del pin del mapa (Leaflet): latitud y longitud exactas
ALTER TABLE instituciones
  ADD COLUMN latitud DECIMAL(10,7) NULL, -- Latitud del pin (-90 a 90)
  ADD COLUMN longitud DECIMAL(10,7) NULL; -- Longitud del pin (-180 a 180)

-- 2. Tabla donde se registra el motivo de quien elimina su cuenta
CREATE TABLE IF NOT EXISTS bajas_cuenta (
  id INT NOT NULL AUTO_INCREMENT, -- Identificador único
  usuario_id INT NULL, -- Usuario que se dio de baja (NULL si luego se borra el usuario)
  rol VARCHAR(30) NOT NULL, -- Rol que tenía al darse de baja
  motivo ENUM('no_uso_la_plataforma','encontre_otra_alternativa','problemas_tecnicos','dificil_de_usar','privacidad','otro') NOT NULL, -- Motivo elegido
  motivo_otro VARCHAR(255) NULL, -- Detalle del motivo (sólo si el motivo es 'otro')
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha y hora de la baja
  PRIMARY KEY (id), -- Clave primaria
  KEY idx_bajas_usuario (usuario_id), -- Índice para buscar por usuario
  CONSTRAINT fk_bajas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE -- Si se borra el usuario, la baja queda con usuario_id en NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; -- Motor y codificación (igual que tus otras migraciones)
