import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
export const representanteInstituModel=sequelize.define("representanteInstitucion",{id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},usuario_id:{type:DataTypes.INTEGER,allowNull:false},institucion_id:{type:DataTypes.INTEGER,allowNull:false},cargo:{type:DataTypes.STRING(100),allowNull:true}},{tableName:"representantes_institucion",timestamps:true,createdAt:"created_at",updatedAt:false});
