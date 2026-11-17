import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Ideas de cursos dentro de una encuesta GENERAL ("¿qué curso querés que traigamos?").
//  - nuevo:     curso nuevo que propone la institución
//  - volver:    traer de vuelta un curso que la institución ya dictó (curso_id)
//  - propuesta: idea que escribió un estudiante (persona_id)
// Los estudiantes votan las ideas y la institución ve las más votadas.
export const encuestasIdeasModel = sequelize.define(
  "encuestas_ideas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    encuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    origen: { type: DataTypes.ENUM("nuevo", "volver", "propuesta"), allowNull: false, defaultValue: "nuevo" },
    curso_id: { type: DataTypes.INTEGER, allowNull: true },
    persona_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: "encuestas_ideas", timestamps: true, createdAt: "fecha_creacion", updatedAt: false },
);
