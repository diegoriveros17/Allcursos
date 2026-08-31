import { Router } from "express";
import { chatear } from "../controllers/chatbot.controller.js";

export const chatbotRoutes = Router();

// Pública: cualquiera (con o sin sesión) puede consultarle al chatbot
chatbotRoutes.post("/chatbot", chatear);
