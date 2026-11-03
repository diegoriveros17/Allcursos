import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Mensajes de la conversación de una consulta (respuestas del representante y
// repreguntas del ciudadano). El primer mensaje es el de la consulta misma
// (consultas_curso.mensaje); acá se guarda todo lo que viene después.
export const mensajesConsultaModel = sequelize.define(
  "mensajes_consulta",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    consulta_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }, // Quién lo escribió
    autor: {
      type: DataTypes.ENUM("ciudadano", "representante"),
      allowNull: false,
    },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "mensajes_consulta",
    timestamps: true,
    createdAt: "fecha_creacion",
    updatedAt: false,
    indexes: [{ fields: ["consulta_id"], name: "idx_mensajes_consulta" }],
  },
);
