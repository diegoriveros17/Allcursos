import { Router } from "express";
import { chatear } from "../controllers/chatbot.controller.js";
import { chatbotLimiter } from "../middlewares/rateLimit.middleware.js";

export const chatbotRoutes = Router();

// Pública con rate limit: evita abuso de cuota de Gemini API
chatbotRoutes.post("/chatbot", chatbotLimiter, chatear);

