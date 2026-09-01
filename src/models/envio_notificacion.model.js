import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const enviosNotificacionModel = sequelize.define(
  "envios_notificacion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notificacion_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_usado: { type: DataTypes.ENUM("Email", "WhatsApp"), allowNull: false },
    estado: {
      type: DataTypes.ENUM("Pendiente", "Enviado", "Fallido", "Leido"),
      defaultValue: "Pendiente",
    },
    fecha_envio: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "envios_notificacion", timestamps: false },
);
