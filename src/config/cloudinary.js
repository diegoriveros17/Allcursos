import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET),
);

if (isCloudinaryConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  console.log("Cloudinary configurado correctamente para almacenamiento de imágenes.");
} else {
  console.log("Cloudinary no configurado: usando almacenamiento local en disco (/uploads).");
}

export const subirImagenACloudinary = (buffer, folder = "allcursos/cursos") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
};

export { cloudinary, isCloudinaryConfigured };
