// models/instituciones.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const institucionesModel = sequelize.define(
  "instituciones",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    cuit: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    direccion_id: { type: DataTypes.INTEGER, allowNull: true },
    estado_aprobacion: {
      type: DataTypes.ENUM("pendiente", "aprobado", "rechazado"),
      defaultValue: "pendiente",
    },
  },
  {
    tableName: "instituciones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
