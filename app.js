import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { startDB } from "./src/config/database.js";
import { rolesModel } from "./src/models/index.js";
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

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Nunca servir el código fuente del backend ni archivos de configuración como estáticos
app.use(["/src", "/package.json", "/package-lock.json"], (req, res) =>
    res.status(404).end(),
);

app.get("/api/health", (req, res) =>
    res.json({ ok: true, mensaje: "API funcionando" }),
);
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
    app.listen(PORT, () =>
        console.log(`Servidor corriendo en http://localhost:${PORT}`),
    );
}
main().catch((e) => {
    console.error("No se pudo iniciar el servidor:", e);
    process.exit(1);
});
