// routes/categorias.routes.js
import { Router } from "express";
import {
  agregarCategorias,
  borrarCategorias,
  editarCategorias,
  verPorIdCategorias,
  verTodasCategorias,
} from "../controllers/categoria.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const categoriasRoutes = Router();

categoriasRoutes.get("/categorias", verTodasCategorias);
categoriasRoutes.get("/categorias/:id", verPorIdCategorias);
categoriasRoutes.post(
  "/categorias",
  verificarToken,
  verificarRol("representante", "administrador"),
  agregarCategorias,
);
categoriasRoutes.put(
  "/categorias/:id",
  verificarToken,
  verificarRol("representante", "administrador"),
  editarCategorias,
);
categoriasRoutes.delete(
  "/categorias/:id",
  verificarToken,
  verificarRol("administrador"),
  borrarCategorias,
);
