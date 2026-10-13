# AllCursos v2.1 – Qué se agregó

## Cómo ponerlo a andar
1. `npm install` (no hay dependencias nuevas).
2. En tu `.env` agregá (ver `.env.example`):
   - `APP_URL=http://TU_IP_O_DOMINIO:3000`  (o `HOST_IP=192.168.x.x`)
   - `DB_SYNC=force` (igual que antes: recrea tablas, **borra datos**) o `alter` / `safe`.
3. Si tu BD ya tiene datos y no usás `force`: ejecutá `migracion_encuestas_consultas_notificaciones.sql`.
4. `npm run dev`.

## 1. Encuestas dinámicas + estadísticas
- Modelos nuevos: `encuestas_preguntas`, `encuestas_respuestas_detalle` (+ `descripcion` en `encuestas`; `encuestas_respuestas` queda como cabecera, única por persona/encuesta).
- Tipos de pregunta: `opcion_multiple`, `texto_abierto`, `rating` (escala 3/5/7/10), con justificación opcional y obligatoria sí/no.
- API: `POST /api/encuestas` (con `preguntas[]`), `POST /api/encuestas/:id/respuestas`, `GET /api/encuestas/:id/resultados` (agregados, anónimo).
- Front: `encuesta_builder.js` (constructor), `encuesta_responder.js` (estudiante), `estadisticas_encuesta.html` + `.js` (Chart.js 4.4.7: barras/torta/dona, rating con promedio, textos con búsqueda y orden).

## 2. Consultas públicas
- `POST /api/cursos/:id/consultas` (sin login, rate limit 10/h, honeypot anti-bots). Se guarda en `consultas_curso`, avisa en la campanita y envía email con Reply-To al visitante.
- Panel del representante: `GET /api/consultas/mias`, `PUT /api/consultas/:id/estado`.

## 3. URL pública / red / email
- `src/config/appUrl.js`: prioridad `APP_URL` > `HOST_IP:PORT` > `FRONTEND_URL` (si no es localhost) > IP de red detectada.
- Emails, QR de certificados y "recomendar" usan esa URL. `GET /api/config/publica` la expone al front para los links de compartir.
- CORS: el mismo origen siempre está permitido (antes entrar por otra IP rompía POST/PUT).
- `HOST`, `TRUST_PROXY`, `SMTP_SECURE` opcionales; verificación SMTP al arrancar.
- Los links NO se arman con el header Host (evita "host header injection").

## 4. Campanita
- Tabla `notificaciones_usuario`. API: `GET /api/notificaciones/bandeja`, `PUT .../bandeja/:id/leida`, `PUT .../bandeja/leer-todas`.
- Genera avisos: consultas, respuestas de encuesta (agrupadas), inscripciones, cursos/encuestas nuevas.
- UI dentro de `navbar.js` (funciona en todas las páginas).
