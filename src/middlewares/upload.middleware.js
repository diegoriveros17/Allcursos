// src/middlewares/upload.middleware.js
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const carpetaDestino = path.join(__dirname, "..", "..", "uploads", "cursos");

if (!fs.existsSync(carpetaDestino)) {
  fs.mkdirSync(carpetaDestino, { recursive: true });
}

// Guardamos en memoria (no en disco) porque antes de escribir el archivo
// final lo vamos a re-procesar con sharp (redimensionar + comprimir).
const storage = multer.memoryStorage();

const filtroImagen = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const extensionValida = tiposPermitidos.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeValido = tiposPermitidos.test(file.mimetype);
  if (extensionValida && mimeValido) return cb(null, true);
  cb(new Error("Sólo se permiten imágenes JPG, PNG o WEBP"));
};

const multerImagenCurso = multer({
  storage,
  fileFilter: filtroImagen,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB (antes de comprimir)
}).single("imagen");

// Redimensiona (máx 1200px de ancho, sin agrandar imágenes chicas) y
// convierte todo a .webp para que las imágenes de los cursos no pesen
// varios MB innecesariamente. Deja el resultado en req.file.filename, tal
// como lo esperan los controladores (sin tener que cambiar nada más ahí).
async function procesarImagenConSharp(req, res, next) {
  if (!req.file) return next();

  try {
    const sufijo = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const nombreArchivo = `curso-${sufijo}.webp`;
    const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(rutaCompleta);

    req.file.filename = nombreArchivo;
    next();
  } catch (error) {
    return res.status(400).json({
      mensaje: "No se pudo procesar la imagen. Probá con otro archivo.",
      error: error.message,
    });
  }
}

// Envolvemos multer para que sus errores (archivo muy pesado, tipo inválido)
// respondan como JSON en vez de tirar un error sin manejar, y encadenamos el
// procesamiento con sharp.
export const uploadImagenCurso = (req, res, next) => {
  multerImagenCurso(req, res, (error) => {
    if (error) {
      return res.status(400).json({ mensaje: error.message });
    }
    procesarImagenConSharp(req, res, next);
  });
};
