import { Router } from "express";
import { login, register, perfil } from "../controllers/auth.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/me", verificarToken, perfil);
