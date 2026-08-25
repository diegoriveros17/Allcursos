# AllCursos / Practica Profesional — Backend + Frontend conectados

## 1. Qué cambió en esta versión

Antes, el frontend usaba `localStorage` como si fuera la base de datos (los
cursos eran un array hardcodeado en `assets/js/app.js`, las inscripciones se
guardaban en el navegador, etc.). El único endpoint realmente conectado era
`login`. A partir de ahora **todo el flujo habla con la API real** (MySQL vía
Sequelize).

### Backend
- Se eliminaron archivos duplicados/muertos (`cursos.controller.js` viejo,
  `relaciones.js`).
- Contraseñas con hash real (`bcryptjs`) y sesiones con `jsonwebtoken`.
- Nuevo middleware `src/middlewares/auth.middleware.js`:
  - `verificarToken`: exige sesión.
  - `tokenOpcional`: permite seguir sin sesión (usado en inscripción a
    cursos, para el "login opcional").
  - `verificarRol(...roles)`: protege rutas por rol.
- Registro (`POST /api/auth/register`): si el rol es `representante`, crea
  automáticamente la Institución y el vínculo en `representantes_institucion`.
- Cursos: el `institucion_id` de un curso nuevo se toma siempre del
  representante logueado (no del body), se calcula `cupos_disponibles` y hay
  un endpoint para "mis cursos" y otro para ver los alumnos de un curso.
- Inscripciones: si no hay sesión, se crea automáticamente un usuario
  "ciudadano" con los datos del formulario (login opcional real). Se
  respeta el cupo máximo (si no hay cupo, la inscripción queda "En espera").
- Nuevo modelo `certificado.model.js` (la tabla ya existía en tu SQL pero no
  estaba mapeada) y un endpoint que genera un PDF de certificado al vuelo con
  `pdfkit`, sólo si la inscripción está en estado `Finalizado`.
- `app.js` ahora también sirve el frontend estático (mismo servidor, mismo
  origen → sin líos de CORS ni URLs hardcodeadas).

### Frontend
- Nuevo `assets/js/api.js`: capa única de comunicación con la API (maneja el
  token, arma las URLs, etc.). Se incluye en todas las páginas.
- `app.js` (home): trae los cursos reales con `GET /api/cursos`.
- `detalles.js`: trae el curso real y permite inscribirse con o sin sesión
  iniciada.
- `dashboard.js`: panel de ciudadano (mis cursos + certificados en PDF) y
  panel de representante (alta de cursos + métricas + acceso a alumnos).
- `alumnos_curso.js`: alumnos reales de un curso, con opción de marcarlos
  "Finalizado" (habilita su certificado).
- `login.js`: login/registro reales, incluido el alta de institución.

## 2. Endpoints principales agregados/ajustados

| Método | Ruta                                | Auth                     | Descripción |
|--------|--------------------------------------|---------------------------|-------------|
| POST   | `/api/auth/register`                | Pública                   | Alta de ciudadano o representante (crea institución si aplica) |
| POST   | `/api/auth/login`                   | Pública                   | Devuelve `token` + `usuario` |
| GET    | `/api/auth/me`                      | Token                     | Perfil del usuario logueado |
| GET    | `/api/cursos`                       | Pública                   | Listado con filtros `?categoria_id&institucion_id&q` |
| GET    | `/api/cursos/:id`                   | Pública                   | Detalle + cupos disponibles |
| GET    | `/api/cursos/mis-cursos`            | Token (representante)     | Cursos de tu institución |
| POST   | `/api/cursos`                       | Token (representante)     | Crear curso (institución tomada del token) |
| PUT/DELETE `/api/cursos/:id`        | Token (representante)     | Sólo si el curso es tuyo |
| GET    | `/api/cursos/:id/alumnos`           | Token (representante)     | Alumnos inscriptos + sus datos |
| POST   | `/api/inscripciones`                | **Opcional**              | Si hay token, usa esa cuenta; si no, crea una con los datos enviados |
| GET    | `/api/inscripciones/mias`           | Token (ciudadano)         | Mis cursos + estado + certificado |
| PUT    | `/api/inscripciones/:id`            | Token                     | Representante cambia estado; ciudadano sólo puede cancelar |
| GET    | `/api/inscripciones/:id/certificado`| Token (dueño o representante) | Descarga el PDF (sólo si `estado = Finalizado`) |

## 3. Cómo correrlo

```bash
# 1. Instalar dependencias (agrega bcryptjs, jsonwebtoken y pdfkit)
npm install

# 2. Crear la base de datos e importar el dump que ya tenías
mysql -u root -p -e "CREATE DATABASE allcursos"
mysql -u root -p allcursos < ../allcursos__1___1_.sql

# 3. Configurar el .env (copiar .env.example y completar)
cp .env.example .env
# Editar DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT=mysql
# y generar un JWT_SECRET (cualquier string largo y aleatorio)

# 4. Levantar el servidor
npm run dev
```

Con el servidor corriendo en `http://localhost:3000`, abrí directamente
`http://localhost:3000/index.html` (el propio backend sirve el frontend, así
que no hace falta Live Server ni configurar CORS).

## 4. Flujo de prueba sugerido

1. Registrate como **representante** (con nombre de institución) en
   `formulario_registro.html`.
2. Iniciá sesión → en tu panel, publicá un curso.
3. Abrí una ventana de incógnito, andá al curso desde el home **sin loguearte**
   e inscribite completando el formulario de invitado. Vas a ver que se crea
   la cuenta automáticamente.
4. Volvé a tu cuenta de representante → "Ver Alumnos" del curso → vas a ver
   al alumno recién inscripto → botón "Finalizar".
5. Iniciá sesión con la cuenta del alumno (el email que usó; si no puso
   contraseña, es su DNI) → en su panel va a poder descargar el certificado
   en PDF.

## 5. Pendiente para siguientes versiones (fuera del alcance de esta v1)

- Tablas del dump que no se usaron todavía: `requisitos`/`cursos_requisitos`,
  `lista_espera`, `encuestas*`, `notificaciones*`, `medios_contacto*`,
  `tokens_recuperacion`.
- Edición de cursos desde la UI (el endpoint `PUT /api/cursos/:id` ya existe,
  falta el formulario).
- Recuperación de contraseña.
- Paginación en el listado de cursos.
