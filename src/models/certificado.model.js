// models/certificado.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const certificadosModel = sequelize.define(
  "certificados",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    inscripcion_id: { type: DataTypes.INTEGER, allowNull: false, unique: "inscripcion_id" },
    fecha_emision: { type: DataTypes.DATEONLY, allowNull: false },
    url_archivo: { type: DataTypes.STRING(255), allowNull: true },
    codigo_verificacion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "codigo_verificacion",
    },
    // El certificado sólo existe si el representante lo emitió (confirmó que el alumno cumplió con el curso)
    emitido_por: { type: DataTypes.INTEGER, allowNull: true }, // Usuario representante que lo emitió
    anulado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // Si la institución lo dio de baja (el QR deja de validarlo)
    fecha_anulacion: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "certificados",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);
