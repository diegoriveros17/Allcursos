// routes/instituciones.routes.js
import { Router } from "express";
import {
  agregarInstituciones,
  borrarInstituciones,
  editarInstituciones,
  verPorIdInstituciones,
  verTodasInstituciones,
} from "../controllers/instituciones.controller.js";

export const institucionesRoutes = Router();

institucionesRoutes.post("/instituciones", agregarInstituciones);
institucionesRoutes.get("/instituciones", verTodasInstituciones);
institucionesRoutes.get("/instituciones/:id", verPorIdInstituciones);
institucionesRoutes.delete("/instituciones/:id", borrarInstituciones);
institucionesRoutes.put("/instituciones/:id", editarInstituciones);
