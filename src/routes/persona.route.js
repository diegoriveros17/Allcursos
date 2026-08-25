// routes/personas.routes.js
import { Router } from "express";
import {
  agregarPersonas,
  borrarPersonas,
  editarPersonas,
  verPorIdPersonas,
  verTodasPersonas,
} from "../controllers/persona.controller.js";

export const personasRoutes = Router();

personasRoutes.post("/personas", agregarPersonas);
personasRoutes.get("/personas", verTodasPersonas);
personasRoutes.get("/personas/:id", verPorIdPersonas);
personasRoutes.delete("/personas/:id", borrarPersonas);
personasRoutes.put("/personas/:id", editarPersonas);
