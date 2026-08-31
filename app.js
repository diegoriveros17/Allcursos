import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { startDB } from "./src/config/database.js";
import { rolesModel } from "./src/models/index.js";
import { authLimiter, apiLimiter } from "./src/middlewares/rateLimit.middleware.js";
import { iniciarTareasProgramadas } from "./src/utils/cron.service.js";
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

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet({
    // Desactivado porque bloquearía cargar Bootstrap/íconos desde jsdelivr
    // y las imágenes propias; si más adelante agregan una CSP a medida,
    // se puede configurar acá.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// En producción sólo se acepta el origen configurado en FRONTEND_URL; en
// desarrollo se deja abierto para no trabar pruebas locales (Postman, etc).
const origenesPermitidos =
    process.env.NODE_ENV === "production" && process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL]
        : true;
app.use(cors({ origin: origenesPermitidos }));

app.use(express.json());

// Frena intentos de fuerza bruta contra login/registro/recuperación
app.use(
    ["/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/verificaciones"],
    authLimiter,
);
// Límite general, más permisivo, para el resto de la API
app.use("/api", apiLimiter);

// Nunca servir el código fuente del backend ni archivos de configuración como estáticos
app.use(["/src", "/package.json", "/package-lock.json"], (req, res) =>
    res.status(404).end(),
);

app.get("/api/health", (req, res) =>
    res.json({ ok: true, mensaje: "API funcionando" }),
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRouter);
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

// Frontend estático (index.html, dashboard.html, assets/, etc.)
app.use(express.static(__dirname));

app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));
const PORT = process.env.PORT || 3000;
async function inicializarRoles() {
    const n = await rolesModel.count();
    if (n === 0)
        await rolesModel.bulkCreate([
            { nombre: "ciudadano" },
            { nombre: "representante" },
            { nombre: "administrador" },
        ]);
}
async function main() {
    if (!process.env.JWT_SECRET) {
        console.warn(
            "ADVERTENCIA: falta JWT_SECRET en el .env, el login no funcionará correctamente.",
        );
    }
    await startDB();
    await inicializarRoles();
    iniciarTareasProgramadas();
    app.listen(PORT, async () => {
        const url = `http://localhost:${PORT}`;
        console.log(`Servidor corriendo en ${url}`);

        // Abre el navegador automáticamente (como hacía "Go Live"), salvo que
        // se desactive explícitamente con OPEN_BROWSER=false en el .env.
        // Si el paquete "open" no está instalado todavía, no rompe el server:
        // sólo hay que abrir la URL de arriba a mano.
        if (process.env.OPEN_BROWSER !== "false") {
            try {
                const { default: open } = await import("open");
                await open(url);
            } catch {
                console.log(
                    `(Para abrir el navegador automáticamente, corré "npm install" para instalar la dependencia "open")`,
                );
            }
        }
    });
}
main().catch((e) => {
    console.error("No se pudo iniciar el servidor:", e);
    process.exit(1);
});
