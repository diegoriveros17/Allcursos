import { preferenciaNotificacionModel } from "../models/preferencia_notificacion.model.js";
import { categoriasModel } from "../models/categoria.model.js";

// Preferencias granulares por categoría (ej. "de Arte no quiero recibir avisos").
// El canal general por defecto se define en el registro (usuarios.canal_notificacion_preferido);
// esto permite además desactivar/ajustar el canal categoría por categoría.
export const verMisPreferencias = async (req, res) => {
  try {
    const categorias = await categoriasModel.findAll({ order: [["nombre", "ASC"]] });
    const preferencias = await preferenciaNotificacionModel.findAll({
      where: { usuario_id: req.usuario.id },
    });
    const mapa = {};
    preferencias.forEach((p) => (mapa[p.categoria_id] = p));

    const resultado = categorias.map((cat) => ({
      categoria_id: cat.id,
      categoria: cat.nombre,
      canal: mapa[cat.id]?.canal || "Email",
      activo: mapa[cat.id] ? mapa[cat.id].activo : true,
    }));

    return res.status(200).json({ mensaje: "Tus preferencias", preferencias: resultado });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener preferencias", error: error.message });
  }
};

export const actualizarPreferencia = async (req, res) => {
  try {
    const { categoria_id, canal, activo } = req.body;
    if (!categoria_id)
      return res.status(400).json({ mensaje: "Debes indicar la categoría" });

    const [preferencia] = await preferenciaNotificacionModel.findOrCreate({
      where: { usuario_id: req.usuario.id, categoria_id },
      defaults: { canal: canal || "Email", activo: activo !== false },
    });
    await preferencia.update({
      canal: canal || preferencia.canal,
      activo: activo !== undefined ? activo : preferencia.activo,
    });

    return res.status(200).json({ mensaje: "Preferencia actualizada", preferencia });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al actualizar preferencia", error: error.message });
  }
};
