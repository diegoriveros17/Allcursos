# Cambios v2.3 — limpieza y refactorización

## Archivos eliminados
- **Docker:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- **Cloudinary:** `src/config/cloudinary.js`, dependencia `cloudinary` (package.json y package-lock.json), variables `CLOUDINARY_*` de `.env.example`. Las imágenes ahora se guardan siempre en `/uploads` (`src/middlewares/upload.middleware.js` reescrito, sólo disco local).
- **Medios de contacto y preferencias (sin pantalla ni uso):** modelos `tipo_medio_contacto`, `medio_contacto`, `persona_medio_contacto`, `institucion_medio_contacto`, `preferencia_notificacion`; controladores y rutas `medio_contacto` y `preferencia_notificacion`; relaciones en `src/models/index.js`; montaje en `app.js`.
- El chatbot (`chatbot.service.js`) ya no consulta medios de contacto: responde que se contacta desde "Consultar sobre este curso".

## Mi Cuenta
- Se quitó la pestaña/sección **Ubicación** (vista, JS y vista previa). La ubicación (pin o Google Maps) se carga únicamente al **publicar/editar un curso**, por eso la ruta `PUT /api/instituciones/:id/ubicacion` y su controlador se mantienen (los usa ese modal).

## Eliminar cuenta
- Vista: sólo radios de motivo + contraseña. Si se elige "Otro motivo" aparece un campo de una línea (máx. 255) para escribir cuál fue. Se quitó "¿Cómo podríamos mejorar la plataforma?".
- Controlador `eliminarCuenta`: valida contraseña y motivo; el detalle sólo se guarda si el motivo es "otro" (obligatorio, 3 a 255 caracteres).
- Modelo `bajas_cuenta`: la columna `sugerencia` pasó a `motivo_otro VARCHAR(255)`.

## Base de datos
- Con `DB_SYNC=force` no hace falta nada. Si tu BD ya tiene datos, ejecutá **`migracion_limpieza_v2.3.sql`** (borra las 5 tablas sin uso y renombra la columna de `bajas_cuenta`).
- `migracion_ubicacion_bajas.sql` ya crea `bajas_cuenta` con `motivo_otro`.

## Sin tocar (se mencionan por si querés revisarlos)
- `proyecto.js` parece un archivo viejo (importa `./src/relaciones/relaciones.js`, que no existe). `ensure_admin.js` es un script auxiliar para el admin.

## Buscador de lugares en el mapa (modal de curso)
- Campo "Buscar dirección o lugar" con lista de sugerencias; al elegir una, el pin se mueve y el mapa se centra ahí.
- Backend: `buscarLugares()` en `src/utils/geocoding.service.js` (Nominatim de OpenStreetMap, sin API key), controlador `sugerirLugares`, ruta `GET /api/lugares/buscar?q=` (sólo representante/admin, con `lugaresLimiter`: 30 por minuto).
- Frontend: `prepararBuscadorLugares()` en `dashboard.js` (espera 600 ms sin escribir) y `moverPin()` en `mapa.js`.

## Detalle del curso
- `views/detalles.html`: se quitó el buscador (input + botón "Buscar") del navbar, para usuarios logueados y no logueados. El buscador del inicio (`index.html`) no se tocó.
