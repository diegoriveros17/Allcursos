import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const cursoRequisitoModel = sequelize.define(
  "cursos_requisitos",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    requisito_id: { type: DataTypes.INTEGER, allowNull: false },
    es_obligatorio: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "cursos_requisitos", timestamps: false },
);
