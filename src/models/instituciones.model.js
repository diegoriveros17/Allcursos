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
    // NUEVO: dirección, coordenadas o código "Insertar un mapa" de Google Maps tal como lo escribió el representante
    ubicacion_maps: { type: DataTypes.TEXT, allowNull: true }, // TEXT porque el código de Google Maps puede ser largo; null = sin ubicación cargada
    latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true }, // NUEVO: latitud del pin del mapa (-90 a 90); null = sin pin
    longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true }, // NUEVO: longitud del pin del mapa (-180 a 180); null = sin pin
  },
  {
    tableName: "instituciones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
