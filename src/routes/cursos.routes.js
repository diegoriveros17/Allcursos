import { Router } from "express";
import {
  agregarCursos,
  borrarCursos,
  editarCursos,
  verAlumnosPorCurso,
  verMisCursos,
  verPorIdCursos,
  verTodosCursos,
} from "../controllers/cursos.controllers.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const cursosRoutes = Router();

// Rutas públicas (ver cursos no requiere login)
cursosRoutes.get("/cursos", verTodosCursos);

// Rutas del representante (van antes de "/cursos/:id" para no chocar con el id)
cursosRoutes.get(
  "/cursos/mis-cursos",
  verificarToken,
  verificarRol("representante"),
  verMisCursos,
);
cursosRoutes.post(
  "/cursos",
  verificarToken,
  verificarRol("representante"),
  agregarCursos,
);
cursosRoutes.get(
  "/cursos/:id/alumnos",
  verificarToken,
  verificarRol("representante"),
  verAlumnosPorCurso,
);
cursosRoutes.put(
  "/cursos/:id",
  verificarToken,
  verificarRol("representante"),
  editarCursos,
);
cursosRoutes.delete(
  "/cursos/:id",
  verificarToken,
  verificarRol("representante"),
  borrarCursos,
);

cursosRoutes.get("/cursos/:id", verPorIdCursos);
