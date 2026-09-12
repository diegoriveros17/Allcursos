import { Router } from "express";
import { confirmarCodigo, solicitarCodigo } from "../controllers/verificacion.controller.js";
import { verificacionLimiter } from "../middlewares/rateLimit.middleware.js";

export const verificacionRoutes = Router();

// Pública: se usa durante el registro e inscripciones
verificacionRoutes.post("/verificaciones/solicitar", verificacionLimiter, solicitarCodigo);
verificacionRoutes.post("/verificaciones/confirmar", verificacionLimiter, confirmarCodigo);

