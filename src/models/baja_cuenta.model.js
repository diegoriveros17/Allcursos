// models/baja_cuenta.model.js
import { DataTypes } from "sequelize"; // Importa los tipos de datos (INTEGER, STRING, etc.) de Sequelize
import { sequelize } from "../config/database.js"; // Importa la conexión a la base de datos que ya usan los demás modelos

// Lista de motivos permitidos; se exporta para que el controlador valide contra la misma lista
export const MOTIVOS_BAJA = [
  "no_uso_la_plataforma", // El usuario casi no usa la plataforma
  "encontre_otra_alternativa", // Encontró otra plataforma que le sirve más
  "problemas_tecnicos", // Tuvo errores o fallas al usarla
  "dificil_de_usar", // Le resultó complicada de usar
  "privacidad", // Le preocupa la privacidad de sus datos
  "otro", // Cualquier otro motivo (en este caso hay que escribir cuál, en la columna motivo_otro)
]; // Cierra el arreglo de motivos

// Define la tabla "bajas_cuenta": guarda por qué se fue cada usuario (sólo el motivo elegido)
export const bajasCuentaModel = sequelize.define(
  "bajas_cuenta", // Nombre interno del modelo
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // Identificador único autoincremental
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }, // Quién se dio de baja (puede quedar vacío si algún día se borra el usuario)
    rol: { type: DataTypes.STRING(30), allowNull: false }, // Rol que tenía (ciudadano/representante) para poder hacer estadísticas
    motivo: { type: DataTypes.ENUM(...MOTIVOS_BAJA), allowNull: false }, // Motivo elegido; el ENUM sólo acepta los valores de la lista
    motivo_otro: { type: DataTypes.STRING(255), allowNull: true }, // MODIFICADO (v2.3): detalle del motivo, sólo se completa cuando el motivo es "otro" (reemplaza a la columna sugerencia)
  }, // Cierra la definición de columnas
  {
    tableName: "bajas_cuenta", // Nombre real de la tabla en MySQL
    timestamps: true, // Activa las columnas de fecha automáticas
    createdAt: "fecha_creacion", // La fecha de creación se guarda en la columna "fecha_creacion"
    updatedAt: false, // No necesitamos fecha de modificación porque el registro no se edita
  }, // Cierra las opciones
); // Cierra la llamada a define
