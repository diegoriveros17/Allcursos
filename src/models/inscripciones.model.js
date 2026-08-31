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
  },
  {
    tableName: "inscripciones",
    timestamps: true,
    createdAt: "fecha_inscripcion",
    updatedAt: "updated_at",
  },
);
