import { Router } from "express";
import { agregarRequisito, verTodosRequisitos } from "../controllers/requisito.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const requisitosRoutes = Router();

requisitosRoutes.get("/requisitos", verTodosRequisitos);
requisitosRoutes.post(
  "/requisitos",
  verificarToken,
  verificarRol("representante", "administrador"),
  agregarRequisito,
);
