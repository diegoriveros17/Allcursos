import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:
      process.env.DB_HOST === "localhost"
        ? "127.0.0.1"
        : process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    port: process.env.DB_PORT || 3306,
  },
);

export const startDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Conexión con la BD establecida correctamente.");
  } catch (error) {
    console.error(`No se pudo conectar con la BD: ${error.message}`);
    throw error;
  }
};
