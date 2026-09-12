import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const reportesCursosModel = sequelize.define(
  "reportes_cursos",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    email_contacto: { type: DataTypes.STRING(150), allowNull: true },
    motivo: {
      type: DataTypes.ENUM(
        "Contenido engañoso",
        "Spam o publicidad",
        "Datos de contacto falsos",
        "Discriminatorio o inapropiado",
        "Otro",
      ),
      allowNull: false,
    },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    estado: {
      type: DataTypes.ENUM("pendiente", "resuelto", "desestimado"),
      defaultValue: "pendiente",
    },
  },
  {
    tableName: "reportes_cursos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
