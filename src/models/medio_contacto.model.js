import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const mediosContactoModel = sequelize.define(
  "medios_contacto",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_medio_id: { type: DataTypes.INTEGER, allowNull: false },
    valor: { type: DataTypes.STRING(255), allowNull: false },
  },
  { tableName: "medios_contacto", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" },
);
