import { Router } from "express";
import { verMisNotificaciones } from "../controllers/notificacion.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

export const notificacionesRoutes = Router();

notificacionesRoutes.get("/notificaciones/mias", verificarToken, verMisNotificaciones);
