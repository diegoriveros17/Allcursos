// controllers/personas.controller.js
import { personasModel } from "../models/persona.model.js";
import { direccionesModel } from "../models/direcciones.model.js";

export const agregarPersonas = async (req, res) => {
  try {
    const { nombre, apellido, dni, fecha_nacimiento, direccion_id } = req.body;
    const errores = [];

    if (!nombre) errores.push("El nombre es obligatorio");
    if (!apellido) errores.push("El apellido es obligatorio");
    if (!dni) errores.push("El DNI es obligatorio");

    if (errores.length > 0) return res.status(400).json({ errores });

    const persona = await personasModel.create({
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      direccion_id,
    });
    return res
      .status(201)
      .json({ mensaje: "Persona registrada con éxito", persona });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al registrar persona", error: error.message });
  }
};

export const verTodasPersonas = async (req, res) => {
  try {
    const personas = await personasModel.findAll({
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    return res.status(200).json({ mensaje: "Todas las personas", personas });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener personas", error: error.message });
  }
};

export const verPorIdPersonas = async (req, res) => {
  try {
    const persona = await personasModel.findByPk(req.params.id, {
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    if (!persona)
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    return res.status(200).json({ mensaje: "Persona encontrada", persona });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al buscar persona", error: error.message });
  }
};

export const borrarPersonas = async (req, res) => {
  try {
    const eliminados = await personasModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    return res.status(200).json({ mensaje: "Persona eliminada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar persona", error: error.message });
  }
};

export const editarPersonas = async (req, res) => {
  try {
    const [actualizados] = await personasModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    const personaActualizada = await personasModel.findByPk(req.params.id);
    return res
      .status(200)
      .json({ mensaje: "Persona actualizada", personaActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar persona", error: error.message });
  }
};
