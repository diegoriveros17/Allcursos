import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Consultas que envían visitantes (sin cuenta) desde el detalle público de un curso.
export const consultasCursoModel = sequelize.define(
  "consultas_curso",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    institucion_id: { type: DataTypes.INTEGER, allowNull: false },
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
