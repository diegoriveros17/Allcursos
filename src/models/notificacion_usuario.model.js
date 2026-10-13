import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Bandeja de notificaciones DENTRO de la plataforma (la campanita del navbar).
// No reemplaza a `notificaciones` + `envios_notificacion`, que registran los
// envíos por Email/WhatsApp: esta tabla es lo que el usuario ve al abrir la campana.
export const notificacionesUsuarioModel = sequelize.define(
  "notificaciones_usuario",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: {
      type: DataTypes.ENUM(
        "consulta",
        "encuesta_respuesta",
        "encuesta_nueva",
        "inscripcion",
        "curso_nuevo",
        "sistema",
      ),
      allowNull: false,
      defaultValue: "sistema",
    },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    mensaje: { type: DataTypes.STRING(500), allowNull: true },
    // Ruta relativa a la que lleva la notificación al hacer clic (ej. "dashboard.html")
    url: { type: DataTypes.STRING(255), allowNull: true },
    // Cuántos eventos iguales se agruparon en esta notificación (ej. "5 respuestas nuevas")
    contador: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "notificaciones_usuario",
    timestamps: true,
    createdAt: "fecha_creacion",
    updatedAt: false,
    indexes: [{ fields: ["usuario_id", "leida"], name: "idx_notif_usuario_leida" }],
  },
);
