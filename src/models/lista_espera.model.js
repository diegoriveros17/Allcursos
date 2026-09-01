import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const listaEsperaModel = sequelize.define(
  "lista_espera",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    notificado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "lista_espera", timestamps: true, createdAt: "fecha_registro", updatedAt: false },
);
