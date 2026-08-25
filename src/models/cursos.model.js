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
  },
  {
    tableName: "cursos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
