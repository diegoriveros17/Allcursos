import { Router } from "express";
import {
  obtenerMetricas,
  listarRepresentantesPendientes,
  aprobarRepresentante,
  rechazarRepresentante,
  listarUsuarios,
  toggleEstadoUsuario,
  cambiarRolUsuario,
  listarInstitucionesAdmin,
  listarCursosAdmin,
  eliminarCursoAdmin,
  listarReportes,
  actualizarEstadoReporte,
} from "../controllers/admin.controller.js";
import { verificarRol, verificarToken } from "../middlewares/auth.middleware.js";

export const adminRoutes = Router();

// Todas las rutas de este router exigen token válido y rol "administrador"
adminRoutes.use(verificarToken, verificarRol("administrador"));

// Métricas y estadísticas (/api/admin/metricas)
adminRoutes.get("/metricas", obtenerMetricas);

// Flujo de aprobación de representantes e instituciones (/api/admin/representantes/pendientes)
adminRoutes.get("/representantes/pendientes", listarRepresentantesPendientes);
adminRoutes.put("/representantes/:id/aprobar", aprobarRepresentante);
adminRoutes.put("/representantes/:id/rechazar", rechazarRepresentante);

// Gestión de usuarios (/api/admin/usuarios)
adminRoutes.get("/usuarios", listarUsuarios);
adminRoutes.put("/usuarios/:id/estado", toggleEstadoUsuario);
adminRoutes.put("/usuarios/:id/rol", cambiarRolUsuario);

// Gestión de instituciones (/api/admin/instituciones)
adminRoutes.get("/instituciones", listarInstitucionesAdmin);

// Gestión y moderación de cursos (/api/admin/cursos)
adminRoutes.get("/cursos", listarCursosAdmin);
adminRoutes.delete("/cursos/:id", eliminarCursoAdmin);

// Moderación de reportes (/api/admin/reportes)
adminRoutes.get("/reportes", listarReportes);
adminRoutes.put("/reportes/:id", actualizarEstadoReporte);
