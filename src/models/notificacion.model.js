import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const notificacionesModel = sequelize.define(
  "notificaciones",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: true },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
  },
  { tableName: "notificaciones", timestamps: true, createdAt: "fecha_creacion", updatedAt: false },
);
