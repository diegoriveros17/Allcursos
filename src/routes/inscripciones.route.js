// routes/inscripciones.routes.js
import { Router } from "express";
import {
  agregarInscripciones,
  borrarInscripciones,
  editarInscripciones,
  verMisInscripciones,
  verPorIdInscripciones,
  verTodasInscripciones,
} from "../controllers/inscripciones.controller.js";
import { descargarCertificado } from "../controllers/certificado.controller.js";
import {
  tokenOpcional,
  verificarRol,
  verificarToken,
} from "../middlewares/auth.middleware.js";

export const inscripcionesRoutes = Router();

// Inscripción a un curso: login opcional (si no hay sesión, se registra al vuelo)
inscripcionesRoutes.post("/inscripciones", tokenOpcional, agregarInscripciones);

// Mis cursos (ciudadano logueado)
inscripcionesRoutes.get(
  "/inscripciones/mias",
  verificarToken,
  verMisInscripciones,
);

// Certificado en PDF de una inscripción finalizada
inscripcionesRoutes.get(
  "/inscripciones/:id/certificado",
  verificarToken,
  descargarCertificado,
);

inscripcionesRoutes.get(
  "/inscripciones",
  verificarToken,
  verificarRol("administrador"),
  verTodasInscripciones,
);
inscripcionesRoutes.get("/inscripciones/:id", verificarToken, verPorIdInscripciones);
inscripcionesRoutes.put("/inscripciones/:id", verificarToken, editarInscripciones);
inscripcionesRoutes.delete(
  "/inscripciones/:id",
  verificarToken,
  verificarRol("administrador"),
  borrarInscripciones,
);
