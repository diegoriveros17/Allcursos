import { enviosNotificacionModel } from "../models/envio_notificacion.model.js";
import { notificacionesModel } from "../models/notificacion.model.js";
import { cursosModel } from "../models/cursos.model.js";
import { notificacionesUsuarioModel } from "../models/notificacion_usuario.model.js";

// Historial de envíos (Email/WhatsApp) recibidos por el usuario logueado
export const verMisNotificaciones = async (req, res) => {
  try {
    const envios = await enviosNotificacionModel.findAll({
      where: { usuario_id: req.usuario.id },
      include: [
        {
          model: notificacionesModel,
          as: "notificacion",
          include: [{ model: cursosModel, as: "curso", attributes: ["id", "titulo"] }],
        },
      ],
      order: [["id", "DESC"]],
      limit: 30,
    });
    return res.status(200).json({ mensaje: "Tus notificaciones", envios });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener notificaciones", error: error.message });
  }
};

// ============================================================
// BANDEJA INTERNA (campanita del navbar)
// ============================================================

// GET /api/notificaciones/bandeja?limite=15
// Devuelve las más recientes + cuántas hay sin leer en total.
export const verBandeja = async (req, res) => {
  try {
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 15, 1), 50);
    const [notificaciones, no_leidas] = await Promise.all([
      notificacionesUsuarioModel.findAll({
        where: { usuario_id: req.usuario.id },
        order: [["fecha_creacion", "DESC"], ["id", "DESC"]],
        limit: limite,
      }),
      notificacionesUsuarioModel.count({ where: { usuario_id: req.usuario.id, leida: false } }),
    ]);
    return res.status(200).json({ mensaje: "Tu bandeja", no_leidas, notificaciones });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tu bandeja", error: error.message });
  }
};

// PUT /api/notificaciones/bandeja/:id/leida
export const marcarLeida = async (req, res) => {
  try {
    // El filtro por usuario_id evita que alguien marque notificaciones ajenas
    const [actualizadas] = await notificacionesUsuarioModel.update(
      { leida: true },
      { where: { id: req.params.id, usuario_id: req.usuario.id } },
    );
    if (!actualizadas) return res.status(404).json({ mensaje: "Notificación no encontrada" });
    return res.status(200).json({ mensaje: "Marcada como leída" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al marcar la notificación", error: error.message });
  }
};

// PUT /api/notificaciones/bandeja/leer-todas
export const marcarTodasLeidas = async (req, res) => {
  try {
    await notificacionesUsuarioModel.update(
      { leida: true },
      { where: { usuario_id: req.usuario.id, leida: false } },
    );
    return res.status(200).json({ mensaje: "Todas marcadas como leídas" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al marcar las notificaciones", error: error.message });
  }
};
