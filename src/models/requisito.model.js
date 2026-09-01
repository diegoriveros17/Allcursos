import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const requisitosModel = sequelize.define(
  "requisitos",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    descripcion: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  },
  { tableName: "requisitos", timestamps: false },
);
