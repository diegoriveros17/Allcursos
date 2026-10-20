# Cambios v2.2

## 1. Ubicación por institución: pin en mapa (Leaflet) + Google Maps como alternativa
- **Pin**: el representante hace clic en un mapa (Leaflet + OpenStreetMap, sin API key) y se guardan `latitud` y `longitud` en `instituciones`. El estudiante ve el mapa con pin y un botón "Cómo llegar".
- **Prioridad**: si hay pin se muestra el pin; si no, el iframe de Google Maps (dirección, coordenadas o código "Insertar un mapa").
- **Dónde se carga**: Mi Cuenta > Ubicación y el modal "Publicar/Editar curso" (mismo componente en `assets/js/mapa.js`).
- El `PUT /api/instituciones/:id/ubicacion` acepta `ubicacion_maps`, `latitud`, `longitud`; sólo modifica los campos que llegan.
- **Modelo**: `src/models/instituciones.model.js` -> columna `ubicacion_maps` (TEXT).
- **Helper**: `src/utils/mapas.js` -> `construirUrlMapa()` valida y arma la URL segura del iframe.
- **Controlador**: `src/controllers/instituciones.controller.js` -> `guardarUbicacion`, `verUbicacion`.
- **Rutas**: `src/routes/instituciones.routes.js` -> `GET /api/instituciones/:id/ubicacion` (público), `PUT` (representante de esa institución o admin).
- **Detalle de curso**: `cursos.controllers.js` devuelve `mapa_embed_url`.
- **Vistas**: `views/dashboard.html` + `assets/js/dashboard.js` (campo de ubicación y mapa dentro del modal "Publicar/Editar curso"), `views/configuracion.html` (pestaña Ubicación), `assets/js/configuracion.js`, `assets/js/mapa.js` (nuevo), `assets/js/detalles.js` + `views/detalles.html` (mapa para el usuario final).

## 2. Eliminar cuenta con feedback
- **Modelo**: `src/models/baja_cuenta.model.js` (tabla `bajas_cuenta`) + asociaciones en `src/models/index.js`.
- **Controlador**: `eliminarCuenta` en `auth.controller.js` (transacción: guarda feedback + baja lógica `activo=false`).
- **Admin**: `GET /api/admin/bajas` (`admin.controller.js`, `admin.routes.js`).
- **Vistas**: `views/configuracion.html` (radios de motivo + textarea) y `assets/js/configuracion.js` (validación + modal de confirmación).

## Base de datos
Si no usás `DB_SYNC=force`, ejecutá `migracion_ubicacion_bajas.sql`.

## Correcciones
- `app.js`: Helmet enviaba `Referrer-Policy: no-referrer`, y OpenStreetMap bloqueaba los mosaicos (403). Ahora es `strict-origin-when-cross-origin`; además `mapa.js` lo pide en cada mosaico.
- `categoria.controller.js`: si la categoría ya existe (MySQL ignora tildes/mayúsculas por el `unique`), devuelve la existente en vez de dar error 500.
