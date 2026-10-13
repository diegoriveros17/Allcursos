import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Respuesta a UNA pregunta dentro de una participación.
// Según el tipo de pregunta se usa uno de los tres `valor_*`;
// `justificacion` es el texto extra opcional (opcion_multiple / rating).
export const encuestasRespuestasDetalleModel = sequelize.define(
  "encuestas_respuestas_detalle",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    respuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    pregunta_id: { type: DataTypes.INTEGER, allowNull: false },
    valor_opcion: { type: DataTypes.STRING(150), allowNull: true },
    valor_rating: { type: DataTypes.INTEGER, allowNull: true },
    valor_texto: { type: DataTypes.TEXT, allowNull: true },
    justificacion: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "encuestas_respuestas_detalle",
    timestamps: false,
    indexes: [{ unique: true, fields: ["respuesta_id", "pregunta_id"], name: "uq_respuesta_pregunta" }],
  },
);
