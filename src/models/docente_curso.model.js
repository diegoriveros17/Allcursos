// models/docente_curso.model.js
// Equipo docente de un curso: lo carga el representante y se muestra en la página del curso.
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const MAX_DOCENTES_POR_CURSO = 20;

export const docentesCursoModel = sequelize.define(
  "docentes_curso",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false }, // Nombre y apellido
    cargo: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "Profesor" }, // Ej.: "Coordinador / Profesor"
    biografia: { type: DataTypes.TEXT, allowNull: true }, // Formación y experiencia
    foto_url: { type: DataTypes.STRING(255), allowNull: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // Posición en la página del curso
  },
  {
    tableName: "docentes_curso",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
