import rateLimit from "express-rate-limit";

// Mensaje de respuesta estándar para exceso de peticiones
const mensajeLimite = (mensaje) => ({
  mensaje:
    mensaje ||
    "Has superado el límite de intentos permitidos. Por favor, intenta nuevamente más tarde.",
});

// Limitador estricto para inicio de sesión (previene fuerza bruta)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Demasiados intentos de inicio de sesión desde esta IP. Por seguridad, espera 15 minutos antes de volver a intentar.",
  ),
});

// Limitador para registro de nuevos usuarios
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Demasiadas solicitudes de registro desde esta IP. Por favor espera 1 hora.",
  ),
});

// Limitador para recuperación de contraseñas
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Demasiadas solicitudes de recuperación de contraseña. Por favor espera 15 minutos.",
  ),
});

// Limitador para solicitud y confirmación de códigos de verificación
export const verificacionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Demasiadas solicitudes de códigos de verificación. Por favor espera 15 minutos.",
  ),
});

// Limitador para el chatbot con IA (evita agotar cuotas de Gemini)
export const chatbotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Estás enviando mensajes demasiado rápido al asistente virtual. Espera un momento antes de continuar.",
  ),
});

// Limitador para reportes de cursos
export const reporteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite(
    "Has enviado demasiados reportes recientemente. Intenta más tarde.",
  ),
});

// Limitador para "me gusta" en cursos (evita spam de clics)
export const likeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite("Estás dando muchos \"me gusta\" muy rápido. Esperá un momento."),
});

// Limitador para "recomendar curso por email" (evita usarlo para mandar spam)
export const recomendarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite("Has enviado demasiadas recomendaciones. Intenta más tarde."),
});

// Limitador general para la API
export const apiGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeLimite("Demasiadas peticiones a la API desde esta IP."),
});
