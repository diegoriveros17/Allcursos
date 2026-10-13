import { Router } from "express";
import {
  cambiarEstadoConsulta,
  crearConsulta,
  verMisConsultas,
} from "../controllers/consulta.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";
import { consultaLimiter } from "../middlewares/rateLimit.middleware.js";

export const consultasRoutes = Router();

// Público: no requiere cuenta (visitantes interesados en un curso)
consultasRoutes.post("/cursos/:id/consultas", consultaLimiter, crearConsulta);

// Panel del representante
consultasRoutes.get("/consultas/mias", verificarToken, verificarRol("representante"), verMisConsultas);
consultasRoutes.put(
  "/consultas/:id/estado",
  verificarToken,
  verificarRol("representante"),
  cambiarEstadoConsulta,
);
