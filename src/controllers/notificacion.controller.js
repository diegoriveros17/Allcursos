import { enviosNotificacionModel } from "../models/envio_notificacion.model.js";
import { notificacionesModel } from "../models/notificacion.model.js";
import { cursosModel } from "../models/cursos.model.js";

// Historial de notificaciones recibidas por el usuario logueado (campanita)
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
