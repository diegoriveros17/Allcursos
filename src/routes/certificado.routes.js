import { Router } from "express";
import { verificarCertificadoPublico } from "../controllers/certificado.controller.js";

export const certificadosRoutes = Router();

// Pública: cualquiera con el código (o el QR del PDF) puede validar un certificado
certificadosRoutes.get("/certificados/verificar/:codigo", verificarCertificadoPublico);
