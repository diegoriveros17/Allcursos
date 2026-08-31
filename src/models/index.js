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
import { tiposMedioContactoModel } from "./tipo_medio_contacto.model.js";
import { mediosContactoModel } from "./medio_contacto.model.js";
import { personaMedioContactoModel } from "./persona_medio_contacto.model.js";
import { institucionMedioContactoModel } from "./institucion_medio_contacto.model.js";
import { preferenciaNotificacionModel } from "./preferencia_notificacion.model.js";
import { notificacionesModel } from "./notificacion.model.js";
import { enviosNotificacionModel } from "./envio_notificacion.model.js";
import { requisitosModel } from "./requisito.model.js";
import { cursoRequisitoModel } from "./curso_requisito.model.js";
import { listaEsperaModel } from "./lista_espera.model.js";
import { encuestasModel } from "./encuesta.model.js";
import { encuestasRespuestasModel } from "./encuesta_respuesta.model.js";
import { tokensRecuperacionModel } from "./token_recuperacion.model.js";
import { codigosVerificacionModel } from "./codigo_verificacion.model.js";

// --- Medios de contacto ---
tiposMedioContactoModel.hasMany(mediosContactoModel, { foreignKey: "tipo_medio_id", as: "medios" });
mediosContactoModel.belongsTo(tiposMedioContactoModel, { foreignKey: "tipo_medio_id", as: "tipo" });

personasModel.hasMany(personaMedioContactoModel, { foreignKey: "persona_id", as: "medios_contacto" });
personaMedioContactoModel.belongsTo(personasModel, { foreignKey: "persona_id", as: "persona" });
mediosContactoModel.hasMany(personaMedioContactoModel, { foreignKey: "medio_contacto_id", as: "personas" });
personaMedioContactoModel.belongsTo(mediosContactoModel, { foreignKey: "medio_contacto_id", as: "medio" });

institucionesModel.hasMany(institucionMedioContactoModel, { foreignKey: "institucion_id", as: "medios_contacto" });
institucionMedioContactoModel.belongsTo(institucionesModel, { foreignKey: "institucion_id", as: "institucion" });
mediosContactoModel.hasMany(institucionMedioContactoModel, { foreignKey: "medio_contacto_id", as: "instituciones" });
institucionMedioContactoModel.belongsTo(mediosContactoModel, { foreignKey: "medio_contacto_id", as: "medio" });

// --- Preferencias y notificaciones ---
usuariosModel.hasMany(preferenciaNotificacionModel, { foreignKey: "usuario_id", as: "preferencias_notificacion" });
preferenciaNotificacionModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });
categoriasModel.hasMany(preferenciaNotificacionModel, { foreignKey: "categoria_id", as: "preferencias" });
preferenciaNotificacionModel.belongsTo(categoriasModel, { foreignKey: "categoria_id", as: "categoria" });

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

// --- Recuperación de contraseña ---
usuariosModel.hasMany(tokensRecuperacionModel, { foreignKey: "usuario_id", as: "tokens_recuperacion" });
tokensRecuperacionModel.belongsTo(usuariosModel, { foreignKey: "usuario_id", as: "usuario" });

export {
  tiposMedioContactoModel,
  mediosContactoModel,
  personaMedioContactoModel,
  institucionMedioContactoModel,
  preferenciaNotificacionModel,
  notificacionesModel,
  enviosNotificacionModel,
  requisitosModel,
  cursoRequisitoModel,
  listaEsperaModel,
  encuestasModel,
  encuestasRespuestasModel,
  tokensRecuperacionModel,
  codigosVerificacionModel,
};
