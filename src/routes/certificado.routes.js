import { Router } from "express";
import { verificarCertificadoPublico } from "../controllers/certificado.controller.js";

export const certificadosRoutes = Router();

// Pública: cualquiera con el código puede validar que un certificado es real
certificadosRoutes.get("/certificados/verificar/:codigo", verificarCertificadoPublico);
