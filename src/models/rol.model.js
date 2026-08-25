import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const rolesModel = sequelize.define(
  "roles",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "roles",
    timestamps: false, // La tabla roles en la BD no posee timestamps
  }
);