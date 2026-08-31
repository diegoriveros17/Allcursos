import { Router } from "express";
import {
  cerrarEncuesta,
  crearEncuesta,
  responderEncuesta,
  verEncuestasActivas,
  verMisEncuestas,
  verResultadosEncuesta,
} from "../controllers/encuesta.controller.js";
import {
  tokenOpcional,
  verificarRol,
  verificarToken,
} from "../middlewares/auth.middleware.js";

export const encuestasRoutes = Router();

encuestasRoutes.get("/encuestas", tokenOpcional, verEncuestasActivas);
encuestasRoutes.get(
  "/encuestas/mias",
  verificarToken,
  verificarRol("representante"),
  verMisEncuestas,
);
encuestasRoutes.post(
  "/encuestas",
  verificarToken,
  verificarRol("representante"),
  crearEncuesta,
);
encuestasRoutes.post(
  "/encuestas/:id/respuestas",
  verificarToken,
  verificarRol("ciudadano"),
  responderEncuesta,
);
encuestasRoutes.get(
  "/encuestas/:id/resultados",
  verificarToken,
  verificarRol("representante"),
  verResultadosEncuesta,
);
encuestasRoutes.put(
  "/encuestas/:id/cerrar",
  verificarToken,
  verificarRol("representante"),
  cerrarEncuesta,
);
