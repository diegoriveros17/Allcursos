import { Router } from "express";
import {
  agregarCursos,
  agregarRequisitosACurso,
  borrarCursos,
  editarCursos,
  verAlumnosPorCurso,
  verMisCursos,
  verPorIdCursos,
  verTodosCursos,
} from "../controllers/cursos.controllers.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";
import { uploadImagenCurso } from "../middlewares/upload.middleware.js";

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
  uploadImagenCurso,
  agregarCursos,
);
cursosRoutes.get(
  "/cursos/:id/alumnos",
  verificarToken,
  verificarRol("representante"),
  verAlumnosPorCurso,
);
cursosRoutes.post(
  "/cursos/:id/requisitos",
  verificarToken,
  verificarRol("representante"),
  agregarRequisitosACurso,
);
cursosRoutes.put(
  "/cursos/:id",
  verificarToken,
  verificarRol("representante"),
  uploadImagenCurso,
  editarCursos,
);
cursosRoutes.delete(
  "/cursos/:id",
  verificarToken,
  verificarRol("representante"),
  borrarCursos,
);

cursosRoutes.get("/cursos/:id", verPorIdCursos);
