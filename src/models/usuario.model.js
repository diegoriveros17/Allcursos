// models/usuarios.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const usuariosModel = sequelize.define(
  "usuarios",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    persona_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    rol_id: { type: DataTypes.INTEGER, allowNull: false },
    email_login: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    acepta_notificaciones: { type: DataTypes.BOOLEAN, defaultValue: false },
    canal_notificacion_preferido: {
      type: DataTypes.ENUM("Email", "WhatsApp", "Ambos"),
      defaultValue: "Email",
    },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "usuarios",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
