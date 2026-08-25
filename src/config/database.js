import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql",
  },
);

export const startDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync()
    console.log("Conexión con la BD establecida correctamente.");
  } catch (error) {
    console.error(`No se pudo conectar con la BD: ${error.message}`);
    throw error;
  }
};
