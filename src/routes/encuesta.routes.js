import { Router } from "express";
import {
  cerrarEncuesta,
  crearEncuesta,
  proponerIdea,
  votarIdea,
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

// Encuestas generales: los estudiantes proponen y votan ideas de cursos
encuestasRoutes.post(
  "/encuestas/:id/ideas",
  verificarToken,
  verificarRol("ciudadano"),
  proponerIdea,
);
encuestasRoutes.post(
  "/encuestas/:id/ideas/:ideaId/voto",
  verificarToken,
  verificarRol("ciudadano"),
  votarIdea,
);
