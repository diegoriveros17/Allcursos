// controllers/instituciones.controller.js
import { institucionesModel } from "../models/instituciones.model.js";
import { direccionesModel } from "../models/direcciones.model.js";

export const agregarInstituciones = async (req, res) => {
  try {
    const { nombre, cuit, direccion_id } = req.body;
    if (!nombre)
      return res
        .status(400)
        .json({ errores: ["El nombre de la institución es obligatorio"] });

    const institucion = await institucionesModel.create({
      nombre,
      cuit,
      direccion_id,
    });
    return res
      .status(201)
      .json({ mensaje: "Institución creada correctamente", institucion });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al crear institución", error: error.message });
  }
};

export const verTodasInstituciones = async (req, res) => {
  try {
    const instituciones = await institucionesModel.findAll({
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    return res
      .status(200)
      .json({ mensaje: "Todas las instituciones", instituciones });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "Error al obtener instituciones",
        error: error.message,
      });
  }
};

export const verPorIdInstituciones = async (req, res) => {
  try {
    const institucion = await institucionesModel.findByPk(req.params.id, {
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    if (!institucion)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    return res
      .status(200)
      .json({ mensaje: "Institución encontrada", institucion });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "Error al ver institución por id",
        error: error.message,
      });
  }
};

export const borrarInstituciones = async (req, res) => {
  try {
    const eliminados = await institucionesModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    return res.status(200).json({ mensaje: "Institución eliminada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar institución", error: error.message });
  }
};

export const editarInstituciones = async (req, res) => {
  try {
    const [actualizados] = await institucionesModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    const institucionActualizada = await institucionesModel.findByPk(
      req.params.id,
    );
    return res
      .status(200)
      .json({ mensaje: "Institución actualizada", institucionActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar institución", error: error.message });
  }
};
