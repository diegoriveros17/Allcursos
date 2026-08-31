import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const codigosVerificacionModel = sequelize.define(
  "codigos_verificacion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    medio: { type: DataTypes.ENUM("Email", "Telefono"), allowNull: false },
    valor: { type: DataTypes.STRING(150), allowNull: false },
    codigo: { type: DataTypes.STRING(10), allowNull: false },
    fecha_expiracion: { type: DataTypes.DATE, allowNull: false },
    verificado: { type: DataTypes.BOOLEAN, defaultValue: false },
    intentos: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: "codigos_verificacion", timestamps: true, createdAt: "created_at", updatedAt: false },
);
