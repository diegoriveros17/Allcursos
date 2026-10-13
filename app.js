import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { startDB } from "./src/config/database.js";
import { rolesModel, usuariosModel, personasModel } from "./src/models/index.js";
import { authRouter } from "./src/routes/auth.route.js";
import { usuariosRoutes } from "./src/routes/usuario.route.js";
import { personasRoutes } from "./src/routes/persona.route.js";
import { rolesRoutes } from "./src/routes/rol.route.js";
import { direccionesRoutes } from "./src/routes/direcciones.routes.js";
import { institucionesRoutes } from "./src/routes/instituciones.routes.js";
import { categoriasRoutes } from "./src/routes/categoria.routes.js";
import { cursosRoutes } from "./src/routes/cursos.routes.js";
import { inscripcionesRoutes } from "./src/routes/inscripciones.route.js";
import { representanteIntiRouter } from "./src/routes/representante_institucion.routes.js";
import { requisitosRoutes } from "./src/routes/requisito.routes.js";
import { encuestasRoutes } from "./src/routes/encuesta.routes.js";
import { notificacionesRoutes } from "./src/routes/notificacion.routes.js";
import { preferenciasNotificacionRoutes } from "./src/routes/preferencia_notificacion.routes.js";
import { mediosContactoRoutes } from "./src/routes/medio_contacto.routes.js";
import { verificacionRoutes } from "./src/routes/verificacion.routes.js";
import { chatbotRoutes } from "./src/routes/chatbot.routes.js";
import { certificadosRoutes } from "./src/routes/certificado.routes.js";
import { adminRoutes } from "./src/routes/admin.routes.js";
import { consultasRoutes } from "./src/routes/consulta.routes.js";
import { obtenerBaseUrl, obtenerBaseUrlConfigurada, obtenerIpLocal } from "./src/config/appUrl.js";
import { verificarConexionEmail } from "./src/utils/email.service.js";
import { apiGeneralLimiter } from "./src/middlewares/rateLimit.middleware.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Si la app corre detrás de un proxy / balanceador (Nginx, Render, Railway, Cloudflare...),
// TRUST_PROXY=1 hace que Express use la IP y el protocolo reales del visitante
// (necesario para el rate limit y para saber si la petición llegó por https).
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set("trust proxy", v === "true" ? true : /^\d+$/.test(v) ? Number(v) : v);
}

// Seguridad: Cabeceras HTTP con Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Permite cargar CDNs externas (Bootstrap, Bootstrap Icons) y Cloudinary
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Seguridad: Restricción de CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : null;

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    // Una petición "del mismo origen" (la página y la API salen del mismo servidor,
    // sea por localhost, por 192.168.x.x o por un dominio) es siempre legítima.
    // Sin esto, entrar por una IP distinta a la de CORS_ORIGIN rompía los POST/PUT.
    const mismoOrigen = origin && origin === `${req.protocol}://${req.get("host")}`;
    let esLaUrlPublica = false;
    try {
      esLaUrlPublica = !!origin && origin === new URL(obtenerBaseUrl()).origin;
    } catch {
      // APP_URL mal escrita: simplemente no cuenta como origen permitido
    }
    const permitido =
      !origin || !allowedOrigins || mismoOrigen || esLaUrlPublica || allowedOrigins.includes(origin);
    callback(null, { origin: permitido, credentials: true });
  }),
);

app.use(express.json());

// Limitador de tasa de peticiones general para la API
app.use("/api", apiGeneralLimiter);

// Config pública para el frontend: la URL con la que hay que armar los links para compartir.
// Si no hay ninguna configurada devuelve null y el front usa la dirección con la que se abrió la página.
app.get("/api/config/publica", (req, res) => res.json({ baseUrl: obtenerBaseUrlConfigurada() }));

app.get("/api/health", (req, res) =>
  res.json({ ok: true, mensaje: "API funcionando" }),
);

// Archivos multimedia locales (fallback de subidas)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Endpoints de la API
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRoutes);
app.use("/api", usuariosRoutes);
app.use("/api", personasRoutes);
app.use("/api", rolesRoutes);
app.use("/api", direccionesRoutes);
app.use("/api", institucionesRoutes);
app.use("/api", categoriasRoutes);
app.use("/api", cursosRoutes);
app.use("/api", inscripcionesRoutes);
app.use("/api", representanteIntiRouter);
app.use("/api", requisitosRoutes);
app.use("/api", encuestasRoutes);
app.use("/api", notificacionesRoutes);
app.use("/api", preferenciasNotificacionRoutes);
app.use("/api", mediosContactoRoutes);
app.use("/api", verificacionRoutes);
app.use("/api", chatbotRoutes);
app.use("/api", certificadosRoutes);
app.use("/api", consultasRoutes);

// Frontend estático seguro: solo se sirve la carpeta de recursos (assets) y las vistas (views)
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "views")));

// Ruta raíz que sirve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Manejador de 404 para la API y rutas desconocidas
app.use((req, res) => {
  if (req.accepts("html")) {
    return res.status(404).sendFile(path.join(__dirname, "views", "index.html"));
  }
  return res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;

async function inicializarRoles() {
  const n = await rolesModel.count();
  if (n === 0) {
    await rolesModel.bulkCreate([
      { nombre: "ciudadano" },
      { nombre: "representante" },
      { nombre: "administrador" },
    ]);
  }
}

// Crea una cuenta de administrador por defecto si no existe ninguna en el sistema
async function inicializarAdmin() {
  const rolAdmin = await rolesModel.findOne({ where: { nombre: "administrador" } });
  if (!rolAdmin) return;

  const count = await usuariosModel.count({ where: { rol_id: rolAdmin.id } });
  if (count === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@allcursos.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

    let persona = await personasModel.findOne({ where: { dni: "ADMIN-001" } });
    if (!persona) {
      persona = await personasModel.create({
        nombre: "Administrador",
        apellido: "Principal",
        dni: "ADMIN-001",
      });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await usuariosModel.create({
      persona_id: persona.id,
      rol_id: rolAdmin.id,
      email_login: adminEmail,
      password_hash: passwordHash,
      activo: true,
      estado_aprobacion: "aprobado",
      email_verificado: true,
    });

    console.log(
      `[Seguridad] Usuario administrador inicial creado: ${adminEmail} (Contraseña: ${adminPassword})`,
    );
  }
}

async function main() {
  if (!process.env.JWT_SECRET) {
    console.warn(
      "ADVERTENCIA: falta JWT_SECRET en el .env, el login no funcionará correctamente.",
    );
  }
  await startDB();
  await inicializarRoles();
  await inicializarAdmin();

  verificarConexionEmail();

  // HOST es opcional. Sin HOST, Express escucha en TODAS las interfaces de red
  // (localhost, IP de la LAN, IP pública), así que se puede entrar desde otros equipos.
  const onListen = async () => {
    const urlLocal = `http://localhost:${PORT}`;
    const ip = obtenerIpLocal();
    console.log(`Servidor corriendo en ${urlLocal}`);
    if (ip) console.log(`Accesible en tu red en http://${ip}:${PORT}`);
    console.log(`URL pública usada en emails y enlaces compartibles: ${obtenerBaseUrl()}`);
    if (!process.env.APP_URL && !process.env.HOST_IP) {
      console.log(
        "(Tip: definí APP_URL o HOST_IP en el .env para fijar la URL de los enlaces de los emails)",
      );
    }

    if (process.env.OPEN_BROWSER !== "false") {
      try {
        const { default: open } = await import("open");
        await open(urlLocal);
      } catch {
        console.log(
          `(Para abrir el navegador automáticamente, corré "npm install" para instalar la dependencia "open")`,
        );
      }
    }
  };
  if (process.env.HOST) app.listen(PORT, process.env.HOST, onListen);
  else app.listen(PORT, onListen);
}

main().catch((e) => {
  console.error("No se pudo iniciar el servidor:", e);
  process.exit(1);
});
