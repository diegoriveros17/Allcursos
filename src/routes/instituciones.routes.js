// routes/instituciones.routes.js
import { Router } from "express";
import {
  agregarInstituciones,
  borrarInstituciones,
  editarInstituciones,
  guardarUbicacion, // Controlador nuevo para guardar la ubicación
  sugerirLugares, // NUEVO: controlador del buscador de lugares
  verUbicacion, // Controlador nuevo para ver la ubicación
  verPorIdInstituciones,
  verTodasInstituciones,
} from "../controllers/instituciones.controller.js";
import { lugaresLimiter } from "../middlewares/rateLimit.middleware.js"; // NUEVO: limitador de búsquedas
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js"; // Middlewares que ya usás en otras rutas para exigir sesión y rol

export const institucionesRoutes = Router();

institucionesRoutes.post("/instituciones", agregarInstituciones);
institucionesRoutes.get("/instituciones", verTodasInstituciones);
institucionesRoutes.get("/instituciones/:id", verPorIdInstituciones);
institucionesRoutes.delete("/instituciones/:id", borrarInstituciones);
institucionesRoutes.put("/instituciones/:id", editarInstituciones);

institucionesRoutes.get("/instituciones/:id/ubicacion", verUbicacion); // NUEVO: cualquiera puede ver la ubicación (es información pública)
institucionesRoutes.put("/instituciones/:id/ubicacion", verificarToken, verificarRol("representante", "administrador"), guardarUbicacion); // NUEVO: sólo logueados con rol representante o administrador pueden guardarla
institucionesRoutes.get("/lugares/buscar", verificarToken, verificarRol("representante", "administrador"), lugaresLimiter, sugerirLugares); // NUEVO: buscador de lugares con sugerencias (sólo representantes y administradores, con límite de uso)
