import { Router } from "express";
import { confirmarCodigo, solicitarCodigo } from "../controllers/verificacion.controller.js";

export const verificacionRoutes = Router();

// Pública: se usa durante la inscripción, antes (o sin) tener sesión iniciada
verificacionRoutes.post("/verificaciones/solicitar", solicitarCodigo);
verificacionRoutes.post("/verificaciones/confirmar", confirmarCodigo);
