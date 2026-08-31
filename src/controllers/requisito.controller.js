import { requisitosModel } from "../models/requisito.model.js";

export const verTodosRequisitos = async (req, res) => {
  try {
    const requisitos = await requisitosModel.findAll({ order: [["descripcion", "ASC"]] });
    return res.status(200).json({ mensaje: "Requisitos disponibles", requisitos });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener requisitos", error: error.message });
  }
};

export const agregarRequisito = async (req, res) => {
  try {
    const { descripcion } = req.body;
    if (!descripcion)
      return res.status(400).json({ mensaje: "La descripción es obligatoria" });

    const [requisito, creado] = await requisitosModel.findOrCreate({
      where: { descripcion },
    });
    return res.status(creado ? 201 : 200).json({
      mensaje: creado ? "Requisito creado" : "Ese requisito ya existía",
      requisito,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al crear el requisito", error: error.message });
  }
};
