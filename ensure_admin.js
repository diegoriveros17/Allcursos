import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import { usuariosModel } from "./src/models/index.js";
import { startDB } from "./src/config/database.js";

await startDB();
const admin = await usuariosModel.findOne({ where: { email_login: "admin@allcursos.com" } });
if (admin) {
  const matches = await bcrypt.compare("Admin123!", admin.password_hash);
  console.log("Password matches Admin123!:", matches);
  if (!matches) {
    const newHash = await bcrypt.hash("Admin123!", 10);
    await admin.update({ password_hash: newHash, activo: true, estado_aprobacion: "aprobado" });
    console.log("Updated password to Admin123! and estado_aprobacion to aprobado");
  }
}
process.exit(0);
