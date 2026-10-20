// src/middlewares/upload.middleware.js
// Subida de imágenes (portada de cursos y foto de perfil) guardadas en el disco local, dentro de /uploads.
import multer from "multer"; // Librería que procesa archivos enviados desde un formulario (multipart/form-data)
import path from "path"; // Módulo nativo de Node para armar rutas de archivos
import fs from "fs"; // Módulo nativo de Node para trabajar con archivos y carpetas
import { fileURLToPath } from "url"; // Convierte la URL del módulo en una ruta de archivo normal

const __filename = fileURLToPath(import.meta.url); // Ruta completa de este archivo (en módulos ES no existe __filename solo)
const __dirname = path.dirname(__filename); // Carpeta donde está este archivo

// Crea una carpeta si todavía no existe (así no falla la primera vez que se sube un archivo)
const asegurarCarpeta = (ruta) => { // Función auxiliar que recibe la ruta de la carpeta
  if (!fs.existsSync(ruta)) { // Si la carpeta no existe...
    fs.mkdirSync(ruta, { recursive: true }); // ...la crea (recursive crea también las carpetas intermedias)
  } // Cierra el if
}; // Cierra la función

// Arma la configuración de guardado en disco para un tipo de archivo
const crearStorage = (carpeta, prefijo) => // Recibe la carpeta destino y el prefijo del nombre del archivo
  multer.diskStorage({ // Indica a multer que guarde los archivos en el disco
    destination: (req, file, cb) => cb(null, carpeta), // Carpeta donde se guarda cada archivo
    filename: (req, file, cb) => { // Función que decide el nombre final del archivo
      const sufijo = Date.now() + "-" + Math.round(Math.random() * 1e9); // Número único (fecha + azar) para que no se pisen nombres
      cb(null, `${prefijo}-${sufijo}${path.extname(file.originalname)}`); // Nombre final: prefijo + número único + extensión original
    }, // Cierra la función filename
  }); // Cierra diskStorage

// Filtro que acepta únicamente imágenes JPG, PNG o WEBP
const filtroImagen = (req, file, cb) => { // Recibe la petición, el archivo y la función de respuesta
  const tiposPermitidos = /jpeg|jpg|png|webp/; // Expresión regular con los formatos válidos
  const extensionValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase()); // Revisa que la extensión sea válida
  const mimeValido = tiposPermitidos.test(file.mimetype); // Revisa que el tipo MIME (lo que dice el navegador) también sea válido
  if (extensionValida && mimeValido) return cb(null, true); // Si ambos son válidos, acepta el archivo
  cb(new Error("Sólo se permiten imágenes JPG, PNG o WEBP")); // Si no, lo rechaza con este mensaje
}; // Cierra el filtro

// --- Imagen de portada de los cursos ---
const carpetaCursos = path.join(__dirname, "..", "..", "uploads", "cursos"); // Ruta de la carpeta uploads/cursos
asegurarCarpeta(carpetaCursos); // Se asegura de que la carpeta exista

const multerCurso = multer({ // Crea el procesador de archivos para cursos
  storage: crearStorage(carpetaCursos, "curso"), // Guarda en uploads/cursos con nombres tipo curso-123.jpg
  fileFilter: filtroImagen, // Usa el filtro de imágenes
  limits: { fileSize: 3 * 1024 * 1024 }, // Tamaño máximo: 3 MB
}).single("imagen"); // Espera un solo archivo en el campo "imagen" del formulario

// Middleware que se usa en las rutas de cursos
export const uploadImagenCurso = (req, res, next) => { // Recibe petición, respuesta y la función para continuar
  multerCurso(req, res, (error) => { // Ejecuta multer y recibe un posible error
    if (error) { // Si hubo un error (tipo no permitido, archivo muy grande, etc.)...
      return res.status(400).json({ mensaje: error.message }); // ...responde 400 con el motivo
    } // Cierra el if
    if (req.file) { // Si se subió un archivo...
      req.imagen_url = `/uploads/cursos/${req.file.filename}`; // ...guarda en la petición la URL pública de la imagen
    } // Cierra el if
    next(); // Continúa con el siguiente paso (el controlador)
  }); // Cierra la llamada a multer
}; // Cierra el middleware

// --- Foto de perfil (avatar) del usuario ---
const carpetaAvatares = path.join(__dirname, "..", "..", "uploads", "avatars"); // Ruta de la carpeta uploads/avatars
asegurarCarpeta(carpetaAvatares); // Se asegura de que la carpeta exista

const multerAvatar = multer({ // Crea el procesador de archivos para avatares
  storage: crearStorage(carpetaAvatares, "avatar"), // Guarda en uploads/avatars con nombres tipo avatar-123.jpg
  fileFilter: filtroImagen, // Usa el mismo filtro de imágenes
  limits: { fileSize: 2 * 1024 * 1024 }, // Tamaño máximo: 2 MB (alcanza de sobra para una foto de perfil)
}).single("avatar"); // Espera un solo archivo en el campo "avatar" del formulario

// Middleware que se usa en la ruta de foto de perfil
export const uploadAvatarUsuario = (req, res, next) => { // Recibe petición, respuesta y la función para continuar
  multerAvatar(req, res, (error) => { // Ejecuta multer y recibe un posible error
    if (error) { // Si hubo un error...
      return res.status(400).json({ mensaje: error.message }); // ...responde 400 con el motivo
    } // Cierra el if
    if (req.file) { // Si se subió un archivo...
      req.avatar_url = `/uploads/avatars/${req.file.filename}`; // ...guarda en la petición la URL pública del avatar
    } // Cierra el if
    next(); // Continúa con el controlador
  }); // Cierra la llamada a multer
}; // Cierra el middleware
