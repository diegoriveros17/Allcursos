import { Router } from "express";
import {
  actualizarPreferencia,
  verMisPreferencias,
} from "../controllers/preferencia_notificacion.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const preferenciasNotificacionRoutes = Router();

preferenciasNotificacionRoutes.get(
  "/preferencias-notificacion",
  verificarToken,
  verificarRol("ciudadano"),
  verMisPreferencias,
);
preferenciasNotificacionRoutes.put(
  "/preferencias-notificacion",
  verificarToken,
  verificarRol("ciudadano"),
  actualizarPreferencia,
);
