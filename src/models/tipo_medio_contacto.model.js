import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const tiposMedioContactoModel = sequelize.define(
  "tipos_medio_contacto",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  },
  { tableName: "tipos_medio_contacto", timestamps: true, createdAt: "created_at", updatedAt: false },
);
