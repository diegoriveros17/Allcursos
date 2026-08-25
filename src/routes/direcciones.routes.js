// routes/direcciones.routes.js
import { Router } from "express";
import {
  agregarDirecciones,
  borrarDirecciones,
  editarDirecciones,
  verPorIdDirecciones,
  verTodasDirecciones,
} from "../controllers/direcciones.controller.js";

export const direccionesRoutes = Router();

direccionesRoutes.post("/direcciones", agregarDirecciones);
direccionesRoutes.get("/direcciones", verTodasDirecciones);
direccionesRoutes.get("/direcciones/:id", verPorIdDirecciones);
direccionesRoutes.delete("/direcciones/:id", borrarDirecciones);
direccionesRoutes.put("/direcciones/:id", editarDirecciones);
