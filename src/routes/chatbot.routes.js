import { Router } from "express";
import { chatear } from "../controllers/chatbot.controller.js";
import { chatbotLimiter } from "../middlewares/rateLimit.middleware.js";
import { tokenOpcional } from "../middlewares/auth.middleware.js";

export const chatbotRoutes = Router();

// Pública con rate limit (evita abuso de la cuota de Gemini). Si viene un token
// válido, el asistente sabe si hay sesión (para ofrecer inscribir o ver cursos),
// pero nunca hace nada sin que el usuario lo confirme con un botón.
chatbotRoutes.post("/chatbot", chatbotLimiter, tokenOpcional, chatear);
