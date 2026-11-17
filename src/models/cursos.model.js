// models/cursos.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const cursosModel = sequelize.define(
  "cursos",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    duracion_horas: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cupo_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    modalidad: {
      type: DataTypes.ENUM("Presencial", "Virtual", "Híbrido"),
      allowNull: false,
    },
    link_difusion_original: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Fechas de cursado (opcionales). Cuando pasa fecha_fin, el cron
    // (utils/cron.service.js) finaliza solas las inscripciones y habilita el certificado.
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    imagen_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    likes_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    institucion_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    direccion_dictado_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Ubicación PROPIA de cada curso (antes se guardaba en la institución y
    // al cambiarla se cambiaba en todos los cursos). null = sin ubicación propia.
    ubicacion_maps: { type: DataTypes.TEXT, allowNull: true }, // Dirección, coordenadas o código de Google Maps
    latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true }, // Latitud del pin (-90 a 90)
    longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true }, // Longitud del pin (-180 a 180)
  },
  {
    tableName: "cursos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
