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
import { uploadAvatarUsuario } from "../middlewares/upload.middleware.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from "../middlewares/rateLimit.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginLimiter, login);
authRouter.post("/register", registerLimiter, register);
authRouter.get("/me", verificarToken, perfil);
authRouter.put("/me", verificarToken, uploadAvatarUsuario, actualizarPerfil);
authRouter.put("/me/password", verificarToken, cambiarPassword);
authRouter.delete("/me", verificarToken, eliminarCuenta);
authRouter.post("/forgot-password", forgotPasswordLimiter, solicitarRecuperacion);
authRouter.post("/reset-password", forgotPasswordLimiter, confirmarRecuperacion);

