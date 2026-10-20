-- ============================================================
-- MIGRACIÓN v2.3: limpieza de tablas que el sistema ya no usa + ajuste de bajas_cuenta
-- Ejecutar UNA vez si tu BD ya tiene datos (con DB_SYNC=force no hace falta: las tablas se recrean solas).
-- ============================================================

-- 1. Tablas eliminadas: se borran en orden (primero las que dependen de otras por clave foránea)
DROP TABLE IF EXISTS preferencias_notificacion; -- Preferencias por categoría: ninguna pantalla las usaba
DROP TABLE IF EXISTS personas_medios_contacto; -- Unión persona <-> medio de contacto (sin uso)
DROP TABLE IF EXISTS instituciones_medios_contacto; -- Unión institución <-> medio de contacto (sin uso)
DROP TABLE IF EXISTS medios_contacto; -- Medios de contacto (WhatsApp, Facebook, etc.), sin uso
DROP TABLE IF EXISTS tipos_medio_contacto; -- Catálogo de tipos de medio de contacto, sin uso

-- 2. bajas_cuenta: se reemplaza la columna "sugerencia" por "motivo_otro" (sólo para el motivo 'otro')
--    Si ejecutaste migracion_ubicacion_bajas.sql con la versión anterior, la columna se llama "sugerencia":
ALTER TABLE bajas_cuenta
  CHANGE COLUMN sugerencia motivo_otro VARCHAR(255) NULL; -- Renombra y limita el largo a 255 caracteres
UPDATE bajas_cuenta SET motivo_otro = NULL WHERE motivo <> 'otro'; -- Borra detalles de motivos que no eran "otro" (ya no se guardan sugerencias)
