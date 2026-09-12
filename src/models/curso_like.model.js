import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const cursoLikeModel = sequelize.define(
  "curso_likes",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "curso_likes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);
