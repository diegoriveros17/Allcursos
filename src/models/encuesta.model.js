import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const encuestasModel = sequelize.define(
  "encuestas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    // Texto de presentación opcional que ve el estudiante antes de responder
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    institucion_id: { type: DataTypes.INTEGER, allowNull: false },
    curso_id: { type: DataTypes.INTEGER, allowNull: true },
    categoria_id: { type: DataTypes.INTEGER, allowNull: true },
    tipo: {
      type: DataTypes.ENUM("Interes", "Satisfaccion"),
      defaultValue: "Interes",
    },
    // Las encuestas son temporales: activo = false cuando el representante la finaliza.
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    // Hasta cuándo se puede responder. null = hasta que el representante la finalice.
    fecha_cierre: { type: DataTypes.DATEONLY, allowNull: true },
    // Sólo encuestas generales: los estudiantes pueden proponer ideas de cursos
    permite_propuestas: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "encuestas", timestamps: true, createdAt: "fecha_creacion", updatedAt: false },
);
