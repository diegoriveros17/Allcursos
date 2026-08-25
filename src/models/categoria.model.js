// models/categorias.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const categoriasModel = sequelize.define(
  "categorias",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  },
  {
    tableName: "categorias",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);
