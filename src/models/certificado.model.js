// models/certificado.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const certificadosModel = sequelize.define(
  "certificados",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    inscripcion_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    fecha_emision: { type: DataTypes.DATEONLY, allowNull: false },
    url_archivo: { type: DataTypes.STRING(255), allowNull: true },
    codigo_verificacion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "certificados",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);
