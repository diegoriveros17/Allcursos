// src/utils/notificaciones.service.js
import {
  notificacionesModel,
  enviosNotificacionModel,
  notificacionesUsuarioModel,
  representanteInstituModel,
  usuariosModel,
  personasModel,
} from "../models/index.js";
import { enviarEmail, enviarWhatsApp } from "./email.service.js";
import { escaparHtml } from "./html.js";

const recortar = (texto, max) =>
  texto && texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;

// ------------------------------------------------------------
// BANDEJA INTERNA (la campanita del navbar)
// ------------------------------------------------------------

// Crea una notificación en la bandeja de un usuario.
// Si `agrupar` es true y el usuario ya tiene una igual SIN LEER (mismo tipo + url),
// no crea otra: suma 1 al contador y regenera el mensaje con `mensajeAgrupado(n)`.
// Así 40 respuestas a una encuesta se ven como "40 respuestas nuevas", no como 40 avisos.
export async function crearNotificacionUsuario({
  usuario_id,
  tipo = "sistema",
  titulo,
  mensaje = null,
  url = null,
  agrupar = false,
  mensajeAgrupado = null,
}) {
  if (agrupar && url) {
    const existente = await notificacionesUsuarioModel.findOne({
      where: { usuario_id, tipo, url, leida: false },
      order: [["id", "DESC"]],
    });
    if (existente) {
      const contador = existente.contador + 1;
      await existente.update({
        contador,
        mensaje: recortar(mensajeAgrupado ? mensajeAgrupado(contador) : mensaje, 500),
        fecha_creacion: new Date(),
      });
      return existente;
    }
  }
  return notificacionesUsuarioModel.create({
    usuario_id,
    tipo,
    titulo: recortar(titulo, 150),
    mensaje: recortar(mensaje, 500),
    url,
  });
}

// Usuarios (activos y aprobados) que representan a una institución.
export async function obtenerRepresentantesDeInstitucion(institucion_id) {
  const vinculos = await representanteInstituModel.findAll({
    where: { institucion_id },
    include: [
      {
        model: usuariosModel,
        as: "usuario",
        where: { activo: true, estado_aprobacion: "aprobado" },
        include: [{ model: personasModel, as: "persona" }],
      },
    ],
  });
  return vinculos.map((v) => v.usuario).filter(Boolean);
}

// Avisa (campanita y, opcionalmente, email) a todos los representantes de una institución.
export async function notificarRepresentantes(institucion_id, opciones) {
  const { email = null, ...datos } = opciones;
  const representantes = await obtenerRepresentantesDeInstitucion(institucion_id);

  for (const rep of representantes) {
    try {
      await crearNotificacionUsuario({ ...datos, usuario_id: rep.id });
    } catch (error) {
      console.error(`Error creando notificación interna para usuario ${rep.id}:`, error.message);
    }
    if (email) {
      enviarEmail({ to: rep.email_login, ...email }).catch((e) =>
        console.error("Error enviando email a representante:", e.message),
      );
    }
  }
  return representantes;
}

// ------------------------------------------------------------
// ENVÍOS MASIVOS (Email / WhatsApp + bandeja interna)
// ------------------------------------------------------------

// Crea la notificación y se la envía a una lista puntual de usuarios
// (ya filtrados por quien llama), respetando el canal preferido de cada uno.
// Además deja una copia en la bandeja interna de cada usuario para la campanita.
export async function notificarAUsuarios({
  usuarios,
  titulo,
  mensaje,
  curso_id = null,
  tipo = "sistema",
  url = null,
}) {
  if (!usuarios || usuarios.length === 0) return null;

  const notificacion = await notificacionesModel.create({ curso_id, titulo, mensaje });

  // Bandeja interna (una sola consulta para todos los usuarios)
  const urlInterna = url || (curso_id ? `detalles.html?id=${curso_id}` : "dashboard.html");
  await notificacionesUsuarioModel.bulkCreate(
    usuarios.map((u) => ({
      usuario_id: u.id,
      tipo,
      titulo: recortar(titulo, 150),
      mensaje: recortar(mensaje, 500),
      url: urlInterna,
    })),
  );

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
          html: `<p>${escaparHtml(mensaje)}</p>`,
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
      tipo: "curso_nuevo",
      url: `detalles.html?id=${curso.id}`,
    });
  } catch (error) {
    console.error("Error al notificar el nuevo curso:", error.message);
  }
}
