import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const encuestasModel = sequelize.define(
  "encuestas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    institucion_id: { type: DataTypes.INTEGER, allowNull: false },
    curso_id: { type: DataTypes.INTEGER, allowNull: true },
    categoria_id: { type: DataTypes.INTEGER, allowNull: true },
    tipo: {
      type: DataTypes.ENUM("Interes", "Satisfaccion"),
      defaultValue: "Interes",
    },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "encuestas", timestamps: true, createdAt: "fecha_creacion", updatedAt: false },
);
