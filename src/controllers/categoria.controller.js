// controllers/categorias.controller.js
import { categoriasModel } from "../models/categoria.model.js";

export const agregarCategorias = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre)
      return res.status(400).json({ errores: ["El nombre es obligatorio"] });

    const categoria = await categoriasModel.create({ nombre });
    return res
      .status(201)
      .json({ mensaje: "Categoría agregada correctamente", categoria });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al agregar categoría", error: error.message });
  }
};

export const verTodasCategorias = async (req, res) => {
  try {
    const categorias = await categoriasModel.findAll();
    return res.status(200).json({ mensaje: "Lista de categorías", categorias });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener categorías", error: error.message });
  }
};

export const verPorIdCategorias = async (req, res) => {
  try {
    const categoria = await categoriasModel.findByPk(req.params.id);
    if (!categoria)
      return res.status(404).json({ mensaje: "Categoría no encontrada" });
    return res.status(200).json({ mensaje: "Categoría encontrada", categoria });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al buscar categoría", error: error.message });
  }
};

export const borrarCategorias = async (req, res) => {
  try {
    const eliminados = await categoriasModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Categoría no encontrada" });
    return res.status(200).json({ mensaje: "Categoría eliminada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al borrar categoría", error: error.message });
  }
};

export const editarCategorias = async (req, res) => {
  try {
    const [actualizados] = await categoriasModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Categoría no encontrada" });
    const categoriaActualizada = await categoriasModel.findByPk(req.params.id);
    return res
      .status(200)
      .json({ mensaje: "Categoría actualizada", categoriaActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar categoría", error: error.message });
  }
};
