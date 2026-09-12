# AllCursos / Practica Profesional — v2

> **🚀 Cómo abrir la aplicación (leer si usabas "Go Live")**
> El backend de Express ahora sirve también el frontend (mismo servidor,
> mismo puerto). Eso significa:
> - **NO** hay que abrir `index.html` con la extensión "Go Live" de VS Code
>   ni con ningún otro servidor de archivos estáticos.
> - Corré `npm run dev`, esperá el mensaje `Servidor corriendo en
>   http://localhost:3000`, y el navegador se va a abrir solo en esa URL
>   (si no se abre automáticamente, entrá vos manualmente a
>   `http://localhost:3000`).
> - Si abrís `index.html` con Go Live igual (por ejemplo, en
>   `http://127.0.0.1:5500`), las llamadas a la API se rompen a propósito:
>   `assets/js/api.js` arma la URL de la API como
>   `window.location.origin + "/api"`, y en ese caso `window.location.origin`
>   sería `http://127.0.0.1:5500` (el puerto de Go Live) en vez de
>   `http://localhost:3000` (el puerto real del backend) — por eso no
>   encuentra los endpoints. La solución no es tocar esa línea, sino dejar
>   de usar Go Live: todo tiene que abrirse siempre desde la URL que imprime
>   `npm run dev`.

> **📌 Instalación de la base de datos — LEER PRIMERO**
> Si estás empezando de cero (o perdiste los dumps de versiones anteriores),
> usá directamente el archivo **`allcursos_completo.sql`** que está en la
> raíz del proyecto. Ese archivo ya trae la estructura completa y final de
> la base de datos (todo lo del dump original + todo lo agregado en v2 y
> v3), en un solo paso:
> ```bash
> mysql -u root -p -e "CREATE DATABASE allcursos"
> mysql -u root -p allcursos < allcursos_completo.sql
> ```
> No hace falta correr ningún otro `.sql` antes ni después de ese. Los
> archivos `migracion_v2.sql` y `migracion_v3.sql` sólo son necesarios si ya
> tenías la base de la v1 funcionando y con datos cargados que no querés
> perder (ver la sección "Cómo instalar esta versión" más abajo).

Esta versión parte de la v1 (backend + frontend conectados) y agrega todo lo
que faltaba de las tablas del diseño original, más las funcionalidades que
pediste. Abajo está todo explicado: qué se hizo, cómo instalarlo, y las
decisiones/sugerencias que tomé donde el esquema original se quedaba corto.

## 1. Cómo instalar esta versión

```bash
# 1. Dependencias: bcryptjs, jsonwebtoken, pdfkit, multer, nodemailer
npm install

# 2a. CASO MÁS COMÚN — base de datos nueva o querés empezar de cero:
mysql -u root -p -e "CREATE DATABASE allcursos"
mysql -u root -p allcursos < allcursos_completo.sql

# 2b. Sólo si ya tenías la base de la v1 CON DATOS que querés conservar
#     (si no es tu caso, usá la opción 2a de arriba):
mysql -u root -p allcursos < migracion_v2.sql
mysql -u root -p allcursos < migracion_v3.sql

# 3. Actualizar el .env (copiá .env.example de nuevo si no tenés las variables SMTP)
cp .env.example .env
# completar DB_*, JWT_SECRET, y opcionalmente SMTP_* (ver sección 4)

# 4. Levantar el servidor
npm run dev
```

## 2. Qué se agregó en esta versión

### a) Recuperación de contraseña
- `POST /api/auth/forgot-password` `{ email }` → genera un código de 6 dígitos
  (válido 15 min), lo guarda en `tokens_recuperacion` y lo envía por email.
- `POST /api/auth/reset-password` `{ email, codigo, password }` → valida el
  código y actualiza la contraseña.
- Nueva página `recuperar_contrasena.html` (link agregado en `login.html`).
- **Importante:** si no configurás las variables `SMTP_*` en el `.env`, el
  email no se envía de verdad — se imprime en la consola del servidor (modo
  "simulado"), para que puedas probar el flujo igual sin una cuenta de correo
  real. Para mandarlo de verdad, cualquier proveedor SMTP sirve (Gmail con
  "contraseña de aplicación", Brevo, Mailtrap para pruebas, etc.).

### b) El representante ya no puede inscribirse a sus propios cursos
- El backend rechaza con 403 cualquier intento de `POST /api/inscripciones`
  hecho por un usuario que no sea `ciudadano`.
- En `detalles.html`, si el representante está logueado, el botón de
  inscripción ni siquiera se muestra (se reemplaza por un aviso).

### c) Imagen para los cursos
- Se agregó la columna `cursos.imagen_url` (ver `migracion_v2.sql`).
- El formulario "Publicar Nuevo Curso" del panel del representante ahora
  tiene un campo de archivo (JPG/PNG/WEBP, máx. 3MB), que se sube con
  `multer` a `/uploads/cursos` y se sirve como estático.

### d) Notificación por email al publicar un curso nuevo
- Al crear un curso, se dispara automáticamente un email a todos los
  ciudadanos activos que tengan `acepta_notificaciones = true`.
- Queda registrado en `notificaciones` (qué se avisó) y `envios_notificacion`
  (a quién, por qué canal, y si se pudo enviar).
- En el registro, el ciudadano elige su canal preferido: Email, WhatsApp o
  Ambos (`usuarios.canal_notificacion_preferido`, ver "Sugerencias" abajo
  para el porqué de este campo en vez de usar directamente
  `preferencias_notificacion`).
- **Sobre WhatsApp:** el esquema contempla el canal, pero no hay ningún
  proveedor de WhatsApp conectado (haría falta la API de WhatsApp Business o
  algo como Twilio, que son servicios pagos con alta propia). Por ahora,
  elegir "WhatsApp" o "Ambos" deja el mensaje registrado y logueado por
  consola, pero no llega de verdad. Te lo dejo mockeado para no bloquearte,
  y lo integramos el día que tengas las credenciales de un proveedor.

### e) Encuestas
Implementé los dos casos que describiste:
- **Encuesta de interés** (`tipo: "Interes"`): el representante pregunta,
  antes de lanzar un curso, qué categoría de capacitación le gustaría a la
  gente. Opcionalmente atada a una categoría.
- **Encuesta de satisfacción** (`tipo: "Satisfaccion"`): atada a un curso
  puntual ya dictado, para medir si conviene relanzarlo.

Endpoints: `POST /api/encuestas` (crear), `GET /api/encuestas` (activas,
para que el ciudadano las vea y responda), `POST /api/encuestas/:id/respuestas`
(responder, una vez por persona), `GET /api/encuestas/:id/resultados` (ver
respuestas, sólo el dueño), `PUT /api/encuestas/:id/cerrar`.

En el dashboard: el representante tiene un botón "Nueva Encuesta" (elige el
tipo con un switch) y una tabla con "Ver Resultados"/"Cerrar"; el ciudadano
ve una lista de encuestas pendientes con un campo de texto para responder.

### f) Requisitos de los cursos
- `GET /api/requisitos` (listado), `POST /api/requisitos` (crear uno nuevo).
- Al publicar un curso, el representante ve checkboxes con los requisitos
  existentes para asociarlos (`POST /api/cursos/:id/requisitos` para
  agregarlos después de creado el curso, si hiciera falta).
- Se muestran en `detalles.html`.

### g) Lista de espera real
- Antes (v1) usaba el estado `"En espera"` dentro de la tabla `inscripciones`
  como un parche. Ahora se usa la tabla `lista_espera` tal como estaba
  diseñada: si no hay cupo, la persona queda anotada ahí (no se crea una
  inscripción todavía).
- Cuando alguien cancela su inscripción, el sistema promueve automáticamente
  a la primera persona de la lista de espera (por orden de llegada), le crea
  su inscripción y le manda un email avisándole que consiguió el lugar.
- El ciudadano ve en su dashboard una sección "En Lista de Espera" con los
  cursos donde está esperando un cupo.

### h) Resto de tablas (medios de contacto, preferencias)
Para completar el modelo, quedaron con CRUD básico (sin una pantalla
dedicada todavía, pero totalmente funcionales vía API):
- `GET /api/tipos-medio-contacto`
- `POST /api/instituciones/medios-contacto` (el representante carga un
  WhatsApp/Facebook/etc. de su institución)
- `GET /api/instituciones/:id/medios-contacto`
- `POST /api/personas/medios-contacto` (el ciudadano carga una vía de
  contacto alternativa)
- `GET /api/preferencias-notificacion` y `PUT /api/preferencias-notificacion`
  (preferencia de notificación por categoría, más granular que el canal
  general del registro)
- `GET /api/notificaciones/mias` (historial de notificaciones recibidas por
  el usuario logueado)

## 3. Sugerencias que agregué (no estaban contempladas)

1. **`encuestas` necesitaba saber quién la creó.** La tabla original sólo
   tenía `categoria_id`, sin ninguna columna que diga a qué institución
   pertenece. Sin eso, cualquier representante podría editar/cerrar la
   encuesta de otro, o no se podría filtrar "mis encuestas". Agregué
   `institucion_id` (obligatorio) y `curso_id` (opcional, para las de
   satisfacción) + un campo `tipo` para diferenciar los dos casos de uso que
   me describiste, que en el diseño original eran indistinguibles.

2. **Canal de notificación: lo puse en `usuarios` en vez de sólo en
   `preferencias_notificacion`.** La tabla `preferencias_notificacion` está
   pensada por categoría (ej: "de Arte no quiero avisos, pero de Tecnología
   sí"), lo cual es genial para una versión más madura, pero no sirve para
   preguntar "¿cómo querés que te avisemos, en general?" en el momento del
   registro, porque en ese momento todavía no eligió ninguna categoría de
   interés. Por eso agregué `usuarios.canal_notificacion_preferido` como
   default general, y dejé `preferencias_notificacion` disponible para el
   día que quieras ofrecer ese ajuste fino por categoría (ya tiene su
   endpoint listo, sólo falta la pantalla).

3. **Constraints únicas que faltaban** (agregadas en `migracion_v2.sql`):
   una persona no puede responder la misma encuesta dos veces, un curso no
   puede tener el mismo requisito repetido, y una persona no puede quedar
   dos veces en la lista de espera del mismo curso. Sin esto, un doble clic
   accidental generaba duplicados silenciosos.

4. **Ideas para más adelante** (no las implementé para no inflar más esta
   versión, pero quedan anotadas):
   - Integrar un proveedor real de WhatsApp (Twilio o WhatsApp Business API)
     para que el canal deje de ser simulado.
   - Pantalla dedicada para que el ciudadano cargue sus propios medios de
     contacto y ajuste sus preferencias por categoría (el backend ya está).
   - Encuestas con opciones de respuesta predefinidas (hoy es texto libre;
     para estadísticas más prolijas convendría radio buttons con opciones
     fijas más un campo "otro").
   - Reenvío del código de recuperación si expiró, con un límite de
     intentos/tiempo para evitar spam de códigos.
   - Editar un curso ya publicado desde la UI (el endpoint `PUT /api/cursos/:id`
     ya soporta imagen y todos los campos, sólo falta el formulario de edición).

## 4. Variables de entorno nuevas

```env
# Si se dejan vacías, los emails se muestran por consola (modo simulado)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=AllCursos <no-responder@allcursos.local>

FRONTEND_URL=http://localhost:3000
```

## 5. Flujo de prueba sugerido para esta versión

1. Registrate como ciudadano eligiendo "Ambos" como canal de notificación.
2. Con una cuenta de representante ya creada (de la v1), publicá un curso
   nuevo con imagen y un par de requisitos → revisá la consola del servidor,
   deberías ver el "email simulado" avisando del curso nuevo.
3. Andá a `detalles.html` de ese curso: deberías ver la imagen y los
   requisitos listados.
4. Iniciá sesión con la cuenta de representante e intentá abrir ese mismo
   curso: el botón de inscripción no debería aparecer.
5. Poné el `cupo_maximo` en 1 y hacé que dos ciudadanos distintos se
   inscriban: el segundo debería quedar en lista de espera. Cancelá la
   inscripción del primero y fijate que el segundo se promueve
   automáticamente (y le llega el aviso simulado).
6. Como representante, creá una encuesta de "Interés" y otra de
   "Satisfacción" sobre un curso ya finalizado. Como ciudadano, respondé
   ambas desde el dashboard. Como representante, mirá los resultados.
7. Probá "¿Olvidaste tu contraseña?" desde el login: pedí el código, mirá la
   consola del servidor, y usalo para poner una contraseña nueva.

---

# v3 — Verificación de contacto al inscribirse + Chatbot

## 1. Instalación de esta versión

```bash
# No hay dependencias nuevas de npm en esta versión (se reutiliza nodemailer
# para el email y se agrega sólo un "SMS simulado" por consola).

# Si ya usaste allcursos_completo.sql para instalar la base, esta migración
# NO hace falta (esas columnas y tablas ya están incluidas ahí).
# Sólo corré esto si venís de una base de la v2 a la que no le aplicaste
# todavía estos cambios:
mysql -u root -p allcursos < migracion_v3.sql

# Actualizá tu .env con las variables nuevas (ver sección 3 de esta parte)
```

## 2. Qué se agregó

### a) Verificación de contacto antes de inscribirse (anti "personas que no existen")
Cuando alguien se inscribe **sin tener una cuenta** (login opcional), ahora el
formulario le pide verificar su email o teléfono con un código antes de poder
confirmar la inscripción:

1. Completa sus datos (incluyendo teléfono, ahora opcional).
2. Elige por dónde quiere verificar: Email o Teléfono (SMS).
3. Toca "Enviar código" → `POST /api/verificaciones/solicitar`.
4. Ingresa el código de 6 dígitos → `POST /api/verificaciones/confirmar`.
5. Recién ahí se habilita el botón "Confirmar Inscripción". El backend
   vuelve a chequear esa verificación al procesar `POST /api/inscripciones`
   (no confía en que el frontend haya validado nada) y guarda
   `inscripciones.contacto_verificado = true`.

**Decisión de diseño:** esto sólo se le pide a quien se inscribe *sin* cuenta
previa (el caso de riesgo real: cualquiera puede tipear un nombre y DNI
inventados). A un usuario que ya inició sesión con su contraseña no se le
vuelve a pedir verificación en cada inscripción, para no generarle fricción
extra. Si en el futuro quieren pedirlo también en el registro inicial (no
sólo al inscribirse), el mismo endpoint de verificación sirve para eso.

**Sobre el SMS:** no hay ningún proveedor de SMS conectado (haría falta algo
como Twilio, que es un servicio pago con alta propia). Por ahora, si eligen
"Teléfono", el código se genera y se guarda igual en la base, pero se
muestra por consola en vez de llegar de verdad al celular — así el flujo
completo se puede probar sin gastar en un proveedor. El email si se
configuran las variables `SMTP_*` (ver v2) llega de verdad.

### b) Verificación de DNI contra un padrón externo (dejado listo, no conectado)
Como me comentaste que no tienen todavía una API gratuita para probar esto,
dejé armada la integración en `src/utils/dni.service.js`:
- Si `DNI_API_URL` está vacío en el `.env` (el caso por defecto), el DNI
  queda marcado como `Sin_verificar` — no bloquea absolutamente nada.
- El día que consigan una API (gratuita o paga), sólo hay que completar
  `DNI_API_URL` y `DNI_API_KEY`, y ajustar la función `mapearRespuesta()` de
  ese archivo según el formato de datos que devuelva ese proveedor en
  particular (cada uno devuelve los campos con nombres distintos).
- El resultado (`Verificado` / `No_verificado` / `Sin_verificar`) se muestra
  como un ícono al lado del DNI en la tabla de alumnos del representante.

### c) Chatbot de la plataforma
Un widget de chat flotante (la burbuja abajo a la derecha, visible en el
inicio, el detalle de un curso, el dashboard y la lista de alumnos) que
responde **únicamente** preguntas sobre los cursos publicados: requisitos,
lugar donde se dictan, modalidad, cupos, duración, categoría, institución y
medios de contacto.

Cómo funciona (`src/utils/chatbot.service.js`):
1. Busca en la base los cursos relacionados con la pregunta (por palabras del
   mensaje, o el curso puntual si el chat se abrió desde su página de
   detalle) y arma un contexto con sus datos reales (nunca inventa cursos).
2. **Si configurás `ANTHROPIC_API_KEY`** en el `.env`, usa un modelo real de
   Claude con un system prompt estricto que:
   - sólo puede usar los datos de cursos que le pasamos como contexto,
   - si le preguntan algo que no tiene que ver con la plataforma (clima,
     política, tareas de programación, etc.), responde que sólo puede
     ayudar con consultas sobre los cursos de AllCursos, sin importar cómo
     se lo reformulen.
3. **Si no configurás esa key**, el chatbot igual funciona: usa un motor de
   reglas simple por palabras clave (detecta si preguntan por "requisitos",
   "lugar", "contacto", "cupos", "modalidad", "duración", etc. y responde con
   los datos reales de la base). No es tan flexible como un modelo real, pero
   cubre el caso de uso sin depender de ninguna cuenta paga.
4. Si el mensaje no tiene ninguna relación con cursos/la plataforma (ej: "qué
   tiempo hace", "resolveme este ejercicio de matemática"), el chatbot corta
   ahí mismo con un mensaje fijo explicando que sólo responde sobre los
   cursos — ni siquiera llega a consultar la IA en ese caso, así se ahorra
   esa llamada.

Para conseguir una `ANTHROPIC_API_KEY`: se genera desde la consola de
Anthropic (console.anthropic.com), en la sección de API Keys de su
organización.

## 3. Variables de entorno nuevas

```env
# Chatbot: opcional. Sin esta key, el chatbot usa un motor de reglas simple
# (igual queda funcional, sólo menos flexible en la redacción de respuestas).
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Verificación de DNI: opcional, no hay ninguna API gratuita conectada.
DNI_API_URL=
DNI_API_KEY=
```

## 4. Flujo de prueba sugerido para esta versión

1. Sin sesión iniciada, abrí un curso e intentá inscribirte: notá que el
   botón "Confirmar Inscripción" está deshabilitado hasta verificar.
2. Pedí el código por Email, mirá la consola del servidor (o tu bandeja si
   configuraste SMTP), confirmalo, y recién ahí completá la inscripción.
3. Probá lo mismo eligiendo "Teléfono" — vas a ver el "SMS simulado" en la
   consola del servidor.
4. Como representante, entrá a "Ver Alumnos" de ese curso: deberías ver el
   badge de "Verificado" en la columna de contacto para ese alumno.
5. Abrí el chatbot (burbuja abajo a la derecha) y probá preguntas como "¿qué
   requisitos tiene el curso de [nombre]?", "¿dónde se dicta?", "¿cómo los
   contacto?". Después probá con algo totalmente ajeno ("contame un chiste",
   "cuál es la capital de Francia") y confirmá que se niega a responder eso.

---

# Rediseño visual + Me gusta / Compartir / Recomendar + QR en certificado

## 1. Migración pendiente

```bash
mysql -u root -p allcursos < migracion_likes.sql
```

Agrega `cursos.likes_count` (contador de "me gusta", arranca en 0).

## 2. Qué se agregó

- **Rediseño visual sobrio**: nueva paleta institucional en `assets/css/style.css`
  (aprovecha que Bootstrap 5.3 usa variables CSS, así que recolorea toda la
  plataforma sin tocar cada página), navbar blanco con sombra en las 9
  vistas, footers unificados, hero del inicio más sobrio.
- **QR en el certificado**: además del código de texto, el PDF ahora incluye
  un QR (abajo a la derecha) que lleva directo a
  `verificar_certificado.html?codigo=...`. Nueva ruta pública
  `GET /api/certificados/verificar/:codigo` (sin login) y la página en sí.
- **"Me gusta"**: contador simple por curso, sin necesidad de cuenta
  (`POST` / `DELETE /api/cursos/:id/like`). El navegador recuerda en
  `localStorage` qué cursos ya likeó, para no mostrar el botón repetido.
  Limitación honesta: al no requerir login, no es a prueba de trampas (se
  puede volver a votar borrando el localStorage) — para un contador de
  interés general es un trade-off razonable.
- **Compartir**: Web Share API (nativa en celulares, abre el selector del
  sistema — ahí aparece Instagram si está instalada) + botones directos de
  WhatsApp, Facebook y X, más "copiar link". Instagram no tiene una URL
  pública de "compartir en el feed" (Meta no lo permite fuera de su app),
  por eso se cubre a través del selector nativo del sistema operativo.
- **Recomendar por email**: `POST /api/cursos/:id/recomendar` con el email
  de un amigo, reutiliza el servicio de email ya existente.

## 3. Pendiente / sugerido para más adelante

- Mostrar el contador de likes también en las tarjetas del listado del
  inicio (hoy sólo está en el detalle del curso).
- Si en algún momento quieren que el "me gusta" sea confiable (no anónimo),
  la solución es exigir login y guardar el voto ligado al `usuario_id`.

---

# Rediseño UX: toasts, likes con cuenta, foto de perfil, página de configuración

## 1. Migración pendiente

```bash
mysql -u root -p allcursos < migracion_likes_v2.sql
```

Agrega la tabla `curso_likes` (un like por usuario y curso, ligado a la
cuenta) y la columna `personas.avatar_url` (foto de perfil). Si ya habías
corrido `migracion_likes.sql` de la vuelta anterior, no pasa nada: esa
columna `likes_count` se sigue usando, ahora respaldada por la tabla real
en vez de incrementarse sin control.

## 2. Qué se cambió

- **"Me gusta" ahora requiere cuenta**: el contador sigue siendo visible
  para cualquiera (con o sin sesión), pero para votar hay que estar
  logueado como ciudadano. Ya no es anónimo: un usuario sólo puede votar
  una vez por curso (antes se podía "hacer trampa" borrando el
  `localStorage`).
- **Se reemplazaron todos los `alert()`/`confirm()` nativos** del
  navegador por un sistema de toasts y un modal de confirmación propio
  (`mostrarToast()` / `confirmarAccion()` en `api.js`, disponibles en toda
  la plataforma). Quedan prolijos, no bloquean la página, y no rompen el
  estilo visual con la ventanita gris del navegador.
- **Tipografía**: se sacó el `fw-bold` que estaba aplicado a todo el menú
  de navegación en las 9 páginas (era la causa de que la tipografía se
  viera "toda en negrita").
- **"Verificar Certificado" se movió al navbar** (visible tanto logueado
  como no logueado), sacándolo de los footers.
- **Hero del inicio simplificado**: ya no hay una imagen gigante de fondo,
  ahora es un banner compacto con degradé sobrio.
- **Buscador reubicado**: se sacó del navbar (quedaba mal ahí) y ahora
  está junto a los filtros de categoría y modalidad, arriba del listado de
  cursos (que también se agregaron en este mismo cambio).
- **Nueva página `configuracion.html` ("Mi Cuenta")**: reemplaza el modal
  que estaba en el dashboard. Incluye:
  - **Foto de perfil**: se sube al elegir el archivo (usa Cloudinary si
    está configurado, igual que las imágenes de los cursos).
  - Editar nombre, apellido, teléfono, email (y datos de la institución si
    sos representante).
  - Cambiar contraseña.
  - Eliminar cuenta.
  - El botón "Mi Cuenta" del dashboard y el avatar del navbar llevan
    directo ahí.

## 3. Nota sobre "reducir modales"

Se sacó el modal más grande y de uso menos frecuente (la configuración de
la cuenta, que ahora es su propia página). Los modales que quedan
(publicar/editar curso, encuestas, contacto de un alumno, recomendar un
curso) son todos de uso puntual y acotado — abrir un formulario corto
sin salir de donde estás —, que es exactamente el caso de uso para el que
un modal tiene sentido. Si en algún momento alguno de esos también se
siente pesado, se puede migrar a su propia página con el mismo criterio.
