import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Una pregunta de una encuesta dinámica. Tres tipos:
//  - opcion_multiple: el estudiante elige UNA de las `opciones` (ej. Bueno / Regular / Malo)
//  - texto_abierto:   respuesta libre (recomendaciones, críticas, sugerencias)
//  - rating:          escala numérica de 1 a `escala_max` (ej. valorar al profesor)
// En opcion_multiple y rating se puede pedir además una justificación en texto.
export const encuestasPreguntasModel = sequelize.define(
  "encuestas_preguntas",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    encuesta_id: { type: DataTypes.INTEGER, allowNull: false },
    texto: { type: DataTypes.STRING(300), allowNull: false },
    tipo: {
      type: DataTypes.ENUM("opcion_multiple", "texto_abierto", "rating"),
      allowNull: false,
    },
    // Se guarda como texto JSON (en vez de columna JSON) para que funcione igual
    // en MySQL y en MariaDB, que devuelven los JSON de forma distinta.
    opciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const valor = this.getDataValue("opciones");
        if (!valor) return [];
        try {
          return JSON.parse(valor);
        } catch {
          return [];
        }
      },
      set(valor) {
        this.setDataValue("opciones", valor == null ? null : JSON.stringify(valor));
      },
    },
    escala_max: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    permite_justificacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    obligatoria: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "encuestas_preguntas", timestamps: false },
);
