import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const institucionMedioContactoModel = sequelize.define(
  "instituciones_medios_contacto",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    institucion_id: { type: DataTypes.INTEGER, allowNull: false },
    medio_contacto_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: "instituciones_medios_contacto", timestamps: false },
);
