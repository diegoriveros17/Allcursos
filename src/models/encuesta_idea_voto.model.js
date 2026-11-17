import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Un voto de un estudiante a una idea de curso (una vez por idea).
export const encuestasIdeasVotosModel = sequelize.define(
  "encuestas_ideas_votos",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idea_id: { type: DataTypes.INTEGER, allowNull: false },
    encuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "encuestas_ideas_votos",
    timestamps: true,
    createdAt: "fecha",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["idea_id", "persona_id"], name: "uq_idea_persona" },
      { fields: ["encuesta_id", "persona_id"], name: "idx_votos_encuesta_persona" },
    ],
  },
);
