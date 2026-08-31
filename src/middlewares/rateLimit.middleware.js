// src/middlewares/rateLimit.middleware.js
import rateLimit from "express-rate-limit";

// Más estricto: login, registro, recuperación de contraseña, códigos de
// verificación. Frena ataques de fuerza bruta y spam de códigos.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje: "Demasiados intentos desde esta IP. Probá de nuevo en unos minutos.",
  },
});

// General para el resto de la API: generoso, sólo para frenar abuso evidente
// (scraping agresivo, bots), no afecta el uso normal de la plataforma.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: "Demasiadas solicitudes. Probá de nuevo en unos minutos." },
});
