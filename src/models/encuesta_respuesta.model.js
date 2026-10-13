import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Cabecera de una participación: "la persona X respondió la encuesta Y".
// Las respuestas a cada pregunta viven en `encuestas_respuestas_detalle`.
// La columna `respuesta` se conserva por compatibilidad con las encuestas
// viejas de una sola pregunta de texto libre.
export const encuestasRespuestasModel = sequelize.define(
  "encuestas_respuestas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    encuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    respuesta: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: "encuestas_respuestas",
    timestamps: true,
    createdAt: "fecha",
    updatedAt: false,
    // Una persona sólo puede responder una vez cada encuesta
    indexes: [{ unique: true, fields: ["encuesta_id", "persona_id"], name: "uq_encuesta_persona" }],
  },
);
