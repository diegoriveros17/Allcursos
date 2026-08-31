import { Router } from "express";
import {
  agregarMedioContactoInstitucion,
  agregarMedioContactoPersona,
  verMediosContactoInstitucion,
  verTiposMedioContacto,
} from "../controllers/medio_contacto.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const mediosContactoRoutes = Router();

mediosContactoRoutes.get("/tipos-medio-contacto", verTiposMedioContacto);
mediosContactoRoutes.get("/instituciones/:id/medios-contacto", verMediosContactoInstitucion);
mediosContactoRoutes.post(
  "/instituciones/medios-contacto",
  verificarToken,
  verificarRol("representante"),
  agregarMedioContactoInstitucion,
);
mediosContactoRoutes.post(
  "/personas/medios-contacto",
  verificarToken,
  agregarMedioContactoPersona,
);
