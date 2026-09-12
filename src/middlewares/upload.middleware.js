// src/middlewares/upload.middleware.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  isCloudinaryConfigured,
  subirImagenACloudinary,
} from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const carpetaDestino = path.join(__dirname, "..", "..", "uploads", "cursos");

if (!fs.existsSync(carpetaDestino)) {
  fs.mkdirSync(carpetaDestino, { recursive: true });
}

const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carpetaDestino),
  filename: (req, file, cb) => {
    const sufijo = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `curso-${sufijo}${path.extname(file.originalname)}`);
  },
});

const storageMemoria = multer.memoryStorage();

const filtroImagen = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const extensionValida = tiposPermitidos.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeValido = tiposPermitidos.test(file.mimetype);
  if (extensionValida && mimeValido) return cb(null, true);
  cb(new Error("Sólo se permiten imágenes JPG, PNG o WEBP"));
};

const multerInstance = multer({
  storage: isCloudinaryConfigured ? storageMemoria : storageLocal,
  fileFilter: filtroImagen,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
}).single("imagen");

// Envolvemos multer y si está configurado Cloudinary subimos el buffer directamente
export const uploadImagenCurso = (req, res, next) => {
  multerInstance(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ mensaje: error.message });
    }

    if (req.file) {
      if (isCloudinaryConfigured && req.file.buffer) {
        try {
          const urlCloudinary = await subirImagenACloudinary(req.file.buffer);
          req.imagen_url = urlCloudinary;
        } catch (uploadErr) {
          return res.status(500).json({
            mensaje: "Error al subir la imagen al almacenamiento en la nube",
            error: uploadErr.message,
          });
        }
      } else if (req.file.filename) {
        req.imagen_url = `/uploads/cursos/${req.file.filename}`;
      }
    }

    next();
  });
};

// --- Foto de perfil (avatar) del usuario, mismo patrón que la imagen de cursos ---
const carpetaAvatares = path.join(__dirname, "..", "..", "uploads", "avatars");
if (!fs.existsSync(carpetaAvatares)) {
  fs.mkdirSync(carpetaAvatares, { recursive: true });
}

const storageLocalAvatar = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carpetaAvatares),
  filename: (req, file, cb) => {
    const sufijo = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${sufijo}${path.extname(file.originalname)}`);
  },
});

const multerAvatar = multer({
  storage: isCloudinaryConfigured ? storageMemoria : storageLocalAvatar,
  fileFilter: filtroImagen,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB, alcanza de sobra para una foto de perfil
}).single("avatar");

export const uploadAvatarUsuario = (req, res, next) => {
  multerAvatar(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ mensaje: error.message });
    }

    if (req.file) {
      if (isCloudinaryConfigured && req.file.buffer) {
        try {
          req.avatar_url = await subirImagenACloudinary(req.file.buffer, "allcursos/avatars");
        } catch (uploadErr) {
          return res.status(500).json({
            mensaje: "Error al subir la foto de perfil",
            error: uploadErr.message,
          });
        }
      } else if (req.file.filename) {
        req.avatar_url = `/uploads/avatars/${req.file.filename}`;
      }
    }

    next();
  });
};
