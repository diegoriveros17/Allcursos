import { Router } from "express";
import {
  login,
  register,
  perfil,
  solicitarRecuperacion,
  confirmarRecuperacion,
  actualizarPerfil,
  cambiarPassword,
  eliminarCuenta,
} from "../controllers/auth.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/me", verificarToken, perfil);
authRouter.put("/me", verificarToken, actualizarPerfil);
authRouter.put("/me/password", verificarToken, cambiarPassword);
authRouter.delete("/me", verificarToken, eliminarCuenta);
authRouter.post("/forgot-password", solicitarRecuperacion);
authRouter.post("/reset-password", confirmarRecuperacion);
