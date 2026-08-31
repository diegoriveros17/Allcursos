// src/utils/notificaciones.service.js
import { Op } from "sequelize";
import {
  notificacionesModel,
  enviosNotificacionModel,
  usuariosModel,
  personasModel,
} from "../models/index.js";
import { enviarEmail, enviarWhatsApp } from "./email.service.js";

// Crea la notificación y se la envía a una lista puntual de usuarios
// (ya filtrados por quien llama), respetando el canal preferido de cada uno.
export async function notificarAUsuarios({ usuarios, titulo, mensaje, curso_id = null }) {
  if (!usuarios || usuarios.length === 0) return null;

  const notificacion = await notificacionesModel.create({ curso_id, titulo, mensaje });

  for (const usuario of usuarios) {
    const canales =
      usuario.canal_notificacion_preferido === "Ambos"
        ? ["Email", "WhatsApp"]
        : [usuario.canal_notificacion_preferido || "Email"];

    for (const canal of canales) {
      const envio = await enviosNotificacionModel.create({
        notificacion_id: notificacion.id,
        usuario_id: usuario.id,
        canal_usado: canal,
        estado: "Pendiente",
      });

      let resultado;
      if (canal === "Email") {
        resultado = await enviarEmail({
          to: usuario.email_login,
          subject: titulo,
          html: `<p>${mensaje}</p>`,
        });
      } else {
        resultado = await enviarWhatsApp({ to: usuario.email_login, mensaje });
      }

      await envio.update({
        estado: resultado.simulado || resultado.enviado ? "Enviado" : "Fallido",
        fecha_envio: new Date(),
      });
    }
  }

  return notificacion;
}

// Notifica a todos los ciudadanos activos que aceptan notificaciones cuando
// se publica un curso nuevo.
export async function notificarNuevoCurso(curso) {
  try {
    const usuarios = await usuariosModel.findAll({
      where: { activo: true, acepta_notificaciones: true },
      include: [
        { model: personasModel, as: "persona" },
        { association: "rol", where: { nombre: "ciudadano" } },
      ],
    });

    await notificarAUsuarios({
      usuarios,
      titulo: `Nuevo curso disponible: ${curso.titulo}`,
      mensaje: `Se publicó un nuevo curso "${curso.titulo}" (${curso.modalidad}). ¡Ya podés inscribirte desde la plataforma!`,
      curso_id: curso.id,
    });
  } catch (error) {
    console.error("Error al notificar el nuevo curso:", error.message);
  }
}
