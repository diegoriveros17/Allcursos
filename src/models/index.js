import { sequelize } from "../config/database.js";
import { personasModel } from "./persona.model.js";
import { rolesModel } from "./rol.model.js";
import { usuariosModel } from "./usuario.model.js";
import { direccionesModel } from "./direcciones.model.js";
import { institucionesModel } from "./instituciones.model.js";
import { categoriasModel } from "./categoria.model.js";
import { cursosModel } from "./cursos.model.js";
import { inscripcionesModel } from "./inscripciones.model.js";
import { representanteInstituModel } from "./representante_institucion.model.js";
import { certificadosModel } from "./certificado.model.js";

// Direccion -> Persona / Institucion / Curso
direccionesModel.hasMany(personasModel, {
  foreignKey: "direccion_id",
  as: "personas",
});
personasModel.belongsTo(direccionesModel, {
  foreignKey: "direccion_id",
  as: "direccion",
});
direccionesModel.hasMany(institucionesModel, {
  foreignKey: "direccion_id",
  as: "instituciones",
});
institucionesModel.belongsTo(direccionesModel, {
  foreignKey: "direccion_id",
  as: "direccion",
});
direccionesModel.hasMany(cursosModel, {
  foreignKey: "direccion_dictado_id",
  as: "cursos_dictados",
});
cursosModel.belongsTo(direccionesModel, {
  foreignKey: "direccion_dictado_id",
  as: "direccion_dictado",
});

// Persona - Usuario - Rol
personasModel.hasOne(usuariosModel, {
  foreignKey: "persona_id",
  as: "usuario",
});
usuariosModel.belongsTo(personasModel, {
  foreignKey: "persona_id",
  as: "persona",
});
rolesModel.hasMany(usuariosModel, { foreignKey: "rol_id", as: "usuarios" });
usuariosModel.belongsTo(rolesModel, { foreignKey: "rol_id", as: "rol" });

// Institucion - Curso / Categoria - Curso
institucionesModel.hasMany(cursosModel, {
  foreignKey: "institucion_id",
  as: "cursos",
});
cursosModel.belongsTo(institucionesModel, {
  foreignKey: "institucion_id",
  as: "institucion",
});
categoriasModel.hasMany(cursosModel, {
  foreignKey: "categoria_id",
  as: "cursos",
});
cursosModel.belongsTo(categoriasModel, {
  foreignKey: "categoria_id",
  as: "categoria",
});

// Usuario - Inscripcion - Curso
usuariosModel.hasMany(inscripcionesModel, {
  foreignKey: "usuario_id",
  as: "inscripciones",
});
inscripcionesModel.belongsTo(usuariosModel, {
  foreignKey: "usuario_id",
  as: "usuario",
});
cursosModel.hasMany(inscripcionesModel, {
  foreignKey: "curso_id",
  as: "inscripciones",
});
inscripcionesModel.belongsTo(cursosModel, {
  foreignKey: "curso_id",
  as: "curso",
});

// Usuario - Institucion mediante representante
usuariosModel.hasMany(representanteInstituModel, {
  foreignKey: "usuario_id",
  as: "representaciones",
});
representanteInstituModel.belongsTo(usuariosModel, {
  foreignKey: "usuario_id",
  as: "usuario",
});
institucionesModel.hasMany(representanteInstituModel, {
  foreignKey: "institucion_id",
  as: "representantes",
});
representanteInstituModel.belongsTo(institucionesModel, {
  foreignKey: "institucion_id",
  as: "institucion",
});

// Inscripcion - Certificado
inscripcionesModel.hasOne(certificadosModel, {
  foreignKey: "inscripcion_id",
  as: "certificado",
});
certificadosModel.belongsTo(inscripcionesModel, {
  foreignKey: "inscripcion_id",
  as: "inscripcion",
});

export {
  sequelize,
  personasModel,
  rolesModel,
  usuariosModel,
  direccionesModel,
  institucionesModel,
  categoriasModel,
  cursosModel,
  inscripcionesModel,
  representanteInstituModel,
  certificadosModel,
};

// ============================================================
// NUEVAS TABLAS (v2)
// ============================================================
import { notificacionesModel } from "./notificacion.model.js";
import { enviosNotificacionModel } from "./envio_notificacion.model.js";
import { requisitosModel } from "./requisito.model.js";
import { cursoRequisitoModel } from "./curso_requisito.model.js";
import { listaEsperaModel } from "./lista_espera.model.js";
import { encuestasModel } from "./encuesta.model.js";
import { encuestasRespuestasModel } from "./encuesta_respuesta.model.js";
import { tokensRecuperacionModel } from "./token_recuperacion.model.js";
import { codigosVerificacionModel } from "./codigo_verificacion.model.js";

// (v2.3) LIMPIEZA: se eliminaron los modelos de medios de contacto y de preferencias de notificación porque ninguna pantalla los usaba

cursosModel.hasMany(notificacionesModel, { foreignKey: "curso_id", as: "notificaciones" });
notificacionesModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });

notificacionesModel.hasMany(enviosNotificacionModel, { foreignKey: "notificacion_id", as: "envios" });
enviosNotificacionModel.belongsTo(notificacionesModel, { foreignKey: "notificacion_id", as: "notificacion" });
usuariosModel.hasMany(enviosNotificacionModel, { foreignKey: "usuario_id", as: "notificaciones_recibidas" });
enviosNotificacionModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

// --- Requisitos ---
cursosModel.belongsToMany(requisitosModel, {
  through: cursoRequisitoModel,
  foreignKey: "curso_id",
  otherKey: "requisito_id",
  as: "requisitos",
});
requisitosModel.belongsToMany(cursosModel, {
  through: cursoRequisitoModel,
  foreignKey: "requisito_id",
  otherKey: "curso_id",
  as: "cursos",
});
cursosModel.hasMany(cursoRequisitoModel, { foreignKey: "curso_id", as: "cursos_requisitos" });
cursoRequisitoModel.belongsTo(requisitosModel, { foreignKey: "requisito_id", as: "requisito" });

// --- Lista de espera ---
cursosModel.hasMany(listaEsperaModel, { foreignKey: "curso_id", as: "lista_espera" });
listaEsperaModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });
personasModel.hasMany(listaEsperaModel, { foreignKey: "persona_id", as: "lista_espera" });
listaEsperaModel.belongsTo(personasModel, { foreignKey: "persona_id", as: "persona" });

// --- Encuestas ---
institucionesModel.hasMany(encuestasModel, { foreignKey: "institucion_id", as: "encuestas" });
encuestasModel.belongsTo(institucionesModel, { foreignKey: "institucion_id", as: "institucion" });
cursosModel.hasMany(encuestasModel, { foreignKey: "curso_id", as: "encuestas" });
encuestasModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });
categoriasModel.hasMany(encuestasModel, { foreignKey: "categoria_id", as: "encuestas" });
encuestasModel.belongsTo(categoriasModel, { foreignKey: "categoria_id", as: "categoria" });

encuestasModel.hasMany(encuestasRespuestasModel, { foreignKey: "encuesta_id", as: "respuestas" });
encuestasRespuestasModel.belongsTo(encuestasModel, { foreignKey: "encuesta_id", as: "encuesta" });
personasModel.hasMany(encuestasRespuestasModel, { foreignKey: "persona_id", as: "respuestas_encuestas" });
encuestasRespuestasModel.belongsTo(personasModel, { foreignKey: "persona_id", as: "persona" });

// --- Encuestas dinámicas: preguntas y respuestas por pregunta ---
import { encuestasPreguntasModel } from "./encuesta_pregunta.model.js";
import { encuestasRespuestasDetalleModel } from "./encuesta_respuesta_detalle.model.js";

encuestasModel.hasMany(encuestasPreguntasModel, {
  foreignKey: "encuesta_id",
  as: "preguntas",
  onDelete: "CASCADE",
});
encuestasPreguntasModel.belongsTo(encuestasModel, { foreignKey: "encuesta_id", as: "encuesta" });

encuestasRespuestasModel.hasMany(encuestasRespuestasDetalleModel, {
  foreignKey: "respuesta_id",
  as: "detalles",
  onDelete: "CASCADE",
});
encuestasRespuestasDetalleModel.belongsTo(encuestasRespuestasModel, {
  foreignKey: "respuesta_id",
  as: "participacion",
});
encuestasPreguntasModel.hasMany(encuestasRespuestasDetalleModel, {
  foreignKey: "pregunta_id",
  as: "respuestas",
  onDelete: "CASCADE",
});
encuestasRespuestasDetalleModel.belongsTo(encuestasPreguntasModel, {
  foreignKey: "pregunta_id",
  as: "pregunta",
});

// --- Consultas públicas sobre un curso ---
import { consultasCursoModel } from "./consulta_curso.model.js";
cursosModel.hasMany(consultasCursoModel, { foreignKey: "curso_id", as: "consultas" });
consultasCursoModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });
institucionesModel.hasMany(consultasCursoModel, { foreignKey: "institucion_id", as: "consultas" });
consultasCursoModel.belongsTo(institucionesModel, { foreignKey: "institucion_id", as: "institucion" });

// --- Bandeja de notificaciones internas (campanita) ---
import { notificacionesUsuarioModel } from "./notificacion_usuario.model.js";
usuariosModel.hasMany(notificacionesUsuarioModel, {
  foreignKey: "usuario_id",
  as: "bandeja_notificaciones",
  onDelete: "CASCADE",
});
notificacionesUsuarioModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

// --- Bajas de cuenta (sólo motivo) ---
import { bajasCuentaModel } from "./baja_cuenta.model.js"; // Importa el modelo nuevo
usuariosModel.hasMany(bajasCuentaModel, { foreignKey: "usuario_id", as: "bajas", onDelete: "SET NULL" }); // Un usuario puede tener bajas registradas; si se borra el usuario, la baja se conserva con usuario_id vacío
bajasCuentaModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" }); // Cada baja pertenece a un usuario (se usa para mostrar el email en el panel del admin)

// --- Recuperación de contraseña ---
usuariosModel.hasMany(tokensRecuperacionModel, { foreignKey: "usuario_id", as: "tokens_recuperacion" });
tokensRecuperacionModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

// --- Reportes de Cursos ---
import { reportesCursosModel } from "./reporte_curso.model.js";
cursosModel.hasMany(reportesCursosModel, { foreignKey: "curso_id", as: "reportes" });
reportesCursosModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });
usuariosModel.hasMany(reportesCursosModel, { foreignKey: "usuario_id", as: "reportes_enviados" });
reportesCursosModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

// --- "Me gusta" de cursos (requiere cuenta, un like por usuario y curso) ---
import { cursoLikeModel } from "./curso_like.model.js";
cursosModel.hasMany(cursoLikeModel, { foreignKey: "curso_id", as: "likes" });
cursoLikeModel.belongsTo(cursosModel, { foreignKey: "curso_id", as: "curso" });
usuariosModel.hasMany(cursoLikeModel, { foreignKey: "usuario_id", as: "cursos_likeados" });
cursoLikeModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

export {
  notificacionesModel,
  enviosNotificacionModel,
  requisitosModel,
  cursoRequisitoModel,
  listaEsperaModel,
  encuestasModel,
  encuestasRespuestasModel,
  tokensRecuperacionModel,
  codigosVerificacionModel,
  reportesCursosModel,
  cursoLikeModel,
  encuestasPreguntasModel,
  encuestasRespuestasDetalleModel,
  consultasCursoModel,
  notificacionesUsuarioModel,
  bajasCuentaModel, // Exporta el modelo nuevo junto con los demás
};

