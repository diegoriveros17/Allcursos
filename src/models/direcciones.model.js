// models/direcciones.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const direccionesModel = sequelize.define(
  "direcciones",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    calle: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    barrio: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    provincia: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
  },
  {
    tableName: "direcciones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
