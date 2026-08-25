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
