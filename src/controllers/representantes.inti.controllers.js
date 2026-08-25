import { representanteInstituModel } from "../models/representante_institucion.model.js";

export const agregarRepresentanteIntu = async (req, res) => {
  try {
    const { usuario_id, institucion_id, cargo } = req.body;
    const errores = [];
    if (!usuario_id) errores.push("el usuario es obligaritorio");
    if (!institucion_id) errores.push("institucion debe ser obligatorio");
    if (!cargo) errores.push("el cargo debe ser obligatorio");
    if (errores.length > 0) {
      return res.status(404).json({ errores });
    }
    const representanteInstitu = await representanteInstituModel.create({
      usuario_id,
      institucion_id,
      cargo,
    });
    return res
      .status(201)
      .json({
        mensaje: "representante agregado con exito",
        representanteInstitu,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "uffs,error al agregar representantes",
        error: error.message,
      });
  }
};
export const getTodayRepresentantes = async (req, res) => {
  try {
    const representanteInstitu = await representanteInstituModel.findAll();
    return res
      .status(200)
      .json({
        mensaje: "estos son todos los representantes de cada intitucion",
        representanteInstitu,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "Error al ver todos los representantes",
        error: error.message,
      });
  }
};
export const eliminarRepresentanteInstitu = async (req, res) => {
  try {
    const borraRepresentante = await representanteInstituModel.destroy({
      where: { id: req.params.id },
    });
    if (borraRepresentante) {
      return res
        .status(201)
        .json({ mensaje: "se borró con exito el representante" });
    } else {
      return res.status(404).json({ mensaje: "representante no encontrado" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "error al borrar representante", error: error.message });
  }
};
export const idRepresentanteIntu = async (req, res) => {
  try {
    const representante = await representanteInstituModel.findByPk(
      req.params.id,
    );
    if (representante) {
      return res
        .status(201)
        .json({ mensaje: "este es el representante:", representante });
    } else {
      return res
        .status(404)
        .json({ mensaje: "no se encontró  el representante" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "error al ver por id el representante",
        error: error.message,
      });
  }
};
export const editarRepresentanteIntu = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Ejecutamos la actualización
    const [filasAfectadas] = await representanteInstituModel.update(req.body, {
      where: { id },
    });

    // 2. Verificamos si se modificó alguna fila
    if (filasAfectadas === 0) {
      return res.status(404).json({
        mensaje: "representante no encontrado",
      });
    }

    // 3. Buscamos el registro actualizado para devolverlo
    const updateRepesentante = await representanteInstituModel.findByPk(id);

    return res.status(200).json({
      mensaje: "representante actualizado con éxito",
      representanteInstituModel,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al poder editar representante" });
  }
};
