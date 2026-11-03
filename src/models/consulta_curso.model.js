import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Consultas que envían los ciudadanos (con su cuenta) desde el detalle de un curso.
// Se responden sólo dentro de la plataforma: ver mensajes_consulta.
export const consultasCursoModel = sequelize.define(
  "consultas_curso",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    institucion_id: { type: DataTypes.INTEGER, allowNull: false },
    // Ciudadano que hizo la consulta. Es null en las consultas viejas de visitantes
    // sin cuenta: esas se vinculan por email cuando la persona inicia sesión.
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    // true cuando la institución respondió y el ciudadano todavía no lo vio
    novedad_ciudadano: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
    estado: {
      type: DataTypes.ENUM("nueva", "leida", "respondida"),
      allowNull: false,
      defaultValue: "nueva",
    },
  },
  {
    tableName: "consultas_curso",
    timestamps: true,
    createdAt: "fecha_creacion",
    updatedAt: false,
    indexes: [{ fields: ["institucion_id", "estado"], name: "idx_consultas_institucion_estado" }],
  },
);
