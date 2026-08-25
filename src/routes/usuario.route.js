// routes/usuarios.routes.js
import { Router } from "express";
import {
  agregarUsuarios,
  borrarUsuarios,
  editarUsuarios,
  verPorIdUsuarios,
  verTodosUsuarios,
} from "../controllers/usuario.controller.js";

export const usuariosRoutes = Router();

usuariosRoutes.post("/usuarios", agregarUsuarios);
usuariosRoutes.get("/usuarios", verTodosUsuarios);
usuariosRoutes.get("/usuarios/:id", verPorIdUsuarios);
usuariosRoutes.delete("/usuarios/:id", borrarUsuarios);
usuariosRoutes.put("/usuarios/:id", editarUsuarios);
