import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const tokensRecuperacionModel = sequelize.define(
  "tokens_recuperacion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING(100), allowNull: false },
    fecha_expiracion: { type: DataTypes.DATE, allowNull: false },
    usado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "tokens_recuperacion", timestamps: true, createdAt: "created_at", updatedAt: false },
);
