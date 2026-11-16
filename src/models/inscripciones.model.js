// models/inscripciones.model.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const inscripcionesModel = sequelize.define(
  "inscripciones",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    curso_id: { type: DataTypes.INTEGER, allowNull: false },
    estado: {
      type: DataTypes.ENUM(
        "En espera",
        "Inscripto",
        "Cursando",
        "Finalizado",
        "Cancelado",
      ),
      defaultValue: "Inscripto",
    },
    contacto_verificado: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Baja voluntaria del alumno: por qué dejó el curso (lo ve la institución)
    motivo_baja: { type: DataTypes.STRING(100), allowNull: true },
    comentario_baja: { type: DataTypes.TEXT, allowNull: true },
    fecha_baja: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "inscripciones",
    timestamps: true,
    createdAt: "fecha_inscripcion",
    updatedAt: "updated_at",
  },
);

// Motivos que el alumno puede elegir al darse de baja de un curso
export const MOTIVOS_BAJA_CURSO = [
  "Problemas de horario",
  "Cambié de intereses",
  "Motivos personales o de salud",
  "Problemas de traslado o distancia",
  "El curso no era lo que esperaba",
  "Me inscribí por error",
  "Otro motivo",
];
