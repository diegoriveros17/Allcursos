import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const encuestasRespuestasModel = sequelize.define(
  "encuestas_respuestas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    encuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    respuesta: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: "encuestas_respuestas", timestamps: true, createdAt: "fecha", updatedAt: false },
);
