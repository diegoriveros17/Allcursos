import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const preferenciaNotificacionModel = sequelize.define(
  "preferencias_notificacion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    categoria_id: { type: DataTypes.INTEGER, allowNull: false },
    canal: {
      type: DataTypes.ENUM("Email", "WhatsApp", "Ambos"),
      defaultValue: "Email",
    },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "preferencias_notificacion", timestamps: false },
);
