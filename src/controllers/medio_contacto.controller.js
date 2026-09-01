import { tiposMedioContactoModel } from "../models/tipo_medio_contacto.model.js";
import { mediosContactoModel } from "../models/medio_contacto.model.js";
import { institucionMedioContactoModel } from "../models/institucion_medio_contacto.model.js";
import { personaMedioContactoModel } from "../models/persona_medio_contacto.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js";

export const verTiposMedioContacto = async (req, res) => {
  try {
    const tipos = await tiposMedioContactoModel.findAll({ order: [["nombre", "ASC"]] });
    return res.status(200).json({ mensaje: "Tipos de medio de contacto", tipos });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tipos de contacto", error: error.message });
  }
};

// El representante agrega una vía de contacto pública para su institución
// (ej. un WhatsApp de consultas, una página de Facebook, etc.)
export const agregarMedioContactoInstitucion = async (req, res) => {
  try {
    const { tipo_medio_id, valor } = req.body;
    if (!tipo_medio_id || !valor)
      return res.status(400).json({ mensaje: "tipo_medio_id y valor son obligatorios" });

    const representacion = await representanteInstituModel.findOne({
      where: { usuario_id: req.usuario.id },
    });
    if (!representacion)
      return res.status(400).json({ mensaje: "Tu usuario no está vinculado a ninguna institución" });

    const medio = await mediosContactoModel.create({ tipo_medio_id, valor });
    await institucionMedioContactoModel.create({
      institucion_id: representacion.institucion_id,
      medio_contacto_id: medio.id,
    });

    return res.status(201).json({ mensaje: "Medio de contacto agregado", medio });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al agregar medio de contacto", error: error.message });
  }
};

export const verMediosContactoInstitucion = async (req, res) => {
  try {
    const vinculos = await institucionMedioContactoModel.findAll({
      where: { institucion_id: req.params.id },
      include: [{ model: mediosContactoModel, as: "medio", include: [{ model: tiposMedioContactoModel, as: "tipo" }] }],
    });
    return res.status(200).json({
      mensaje: "Medios de contacto de la institución",
      medios: vinculos.map((v) => v.medio),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener medios de contacto", error: error.message });
  }
};

// El propio usuario agrega una vía de contacto alternativa (ej. su WhatsApp
// personal) para que la institución pueda contactarlo si hace falta.
export const agregarMedioContactoPersona = async (req, res) => {
  try {
    const { tipo_medio_id, valor, es_principal } = req.body;
    if (!tipo_medio_id || !valor)
      return res.status(400).json({ mensaje: "tipo_medio_id y valor son obligatorios" });

    const medio = await mediosContactoModel.create({ tipo_medio_id, valor });
    await personaMedioContactoModel.create({
      persona_id: req.usuario.persona_id,
      medio_contacto_id: medio.id,
      es_principal: !!es_principal,
    });

    return res.status(201).json({ mensaje: "Medio de contacto agregado", medio });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al agregar medio de contacto", error: error.message });
  }
};
