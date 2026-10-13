import { Router } from "express";
import {
  marcarLeida,
  marcarTodasLeidas,
  verBandeja,
  verMisNotificaciones,
} from "../controllers/notificacion.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

export const notificacionesRoutes = Router();

// Historial de envíos por Email/WhatsApp
notificacionesRoutes.get("/notificaciones/mias", verificarToken, verMisNotificaciones);

// Campanita del navbar (la ruta fija "leer-todas" va ANTES que "/:id")
notificacionesRoutes.get("/notificaciones/bandeja", verificarToken, verBandeja);
notificacionesRoutes.put("/notificaciones/bandeja/leer-todas", verificarToken, marcarTodasLeidas);
notificacionesRoutes.put("/notificaciones/bandeja/:id/leida", verificarToken, marcarLeida);
