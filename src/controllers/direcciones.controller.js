// controllers/direcciones.controller.js
import { direccionesModel } from "../models/direcciones.model.js";

export const agregarDirecciones = async (req, res) => {
  try {
    const { calle, numero, barrio, ciudad, provincia } = req.body;
    const errores = [];

    if (!calle) errores.push("La calle es obligatoria");
    if (!ciudad) errores.push("La ciudad es obligatoria");
    if (!provincia) errores.push("La provincia es obligatoria");

    if (errores.length > 0) return res.status(400).json({ errores });

    const direccion = await direccionesModel.create({
      calle,
      numero,
      barrio,
      ciudad,
      provincia,
    });
    return res
      .status(201)
      .json({ mensaje: "Dirección agregada correctamente", direccion });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al agregar dirección", error: error.message });
  }
};

export const verTodasDirecciones = async (req, res) => {
  try {
    const direcciones = await direccionesModel.findAll();
    return res
      .status(200)
      .json({ mensaje: "Lista de direcciones", direcciones });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener direcciones", error: error.message });
  }
};

export const verPorIdDirecciones = async (req, res) => {
  try {
    const direccion = await direccionesModel.findByPk(req.params.id);
    if (!direccion)
      return res.status(404).json({ mensaje: "Dirección no encontrada" });
    return res.status(200).json({ mensaje: "Dirección encontrada", direccion });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al buscar dirección", error: error.message });
  }
};

export const borrarDirecciones = async (req, res) => {
  try {
    const eliminados = await direccionesModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Dirección no encontrada" });
    return res.status(200).json({ mensaje: "Dirección eliminada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al borrar dirección", error: error.message });
  }
};

export const editarDirecciones = async (req, res) => {
  try {
    const [actualizados] = await direccionesModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Dirección no encontrada" });
    const direccionActualizada = await direccionesModel.findByPk(req.params.id);
    return res
      .status(200)
      .json({ mensaje: "Dirección actualizada", direccionActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar dirección", error: error.message });
  }
};
