import { Router } from "express";
import {
  borrarConsulta,
  cambiarEstadoConsulta,
  crearConsulta,
  enviarMensajeConsulta,
  marcarConsultaVista,
  verConsultasEnviadas,
  verMisConsultas,
  vaciarMisConsultas,
} from "../controllers/consulta.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";
import { consultaLimiter, mensajeConsultaLimiter } from "../middlewares/rateLimit.middleware.js";

export const consultasRoutes = Router();

// Ciudadano: consulta sobre un curso (requiere sesión, así la respuesta le llega en la plataforma)
consultasRoutes.post(
  "/cursos/:id/consultas",
  consultaLimiter,
  verificarToken,
  verificarRol("ciudadano"),
  crearConsulta,
);
consultasRoutes.get("/consultas/enviadas", verificarToken, verificarRol("ciudadano"), verConsultasEnviadas);
consultasRoutes.put("/consultas/:id/vista", verificarToken, verificarRol("ciudadano"), marcarConsultaVista);

// Conversación: escriben el ciudadano que consultó y la institución
consultasRoutes.post(
  "/consultas/:id/mensajes",
  mensajeConsultaLimiter,
  verificarToken,
  verificarRol("ciudadano", "representante"),
  enviarMensajeConsulta,
);

// Vaciar la bandeja del representante (va ANTES de "/consultas/:id" para que "mias" no se tome como un id)
consultasRoutes.delete("/consultas/mias", verificarToken, verificarRol("representante"), vaciarMisConsultas);

// Cualquiera de los dos lados puede borrar la conversación de su panel
consultasRoutes.delete("/consultas/:id", verificarToken, verificarRol("ciudadano", "representante"), borrarConsulta);

// Panel del representante
consultasRoutes.get("/consultas/mias", verificarToken, verificarRol("representante"), verMisConsultas);
consultasRoutes.put(
  "/consultas/:id/estado",
  verificarToken,
  verificarRol("representante"),
  cambiarEstadoConsulta,
);
