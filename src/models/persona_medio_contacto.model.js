import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const personaMedioContactoModel = sequelize.define(
  "personas_medios_contacto",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    medio_contacto_id: { type: DataTypes.INTEGER, allowNull: false },
    es_principal: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "personas_medios_contacto", timestamps: false },
);
