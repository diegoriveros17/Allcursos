import { encuestasModel } from "../models/encuesta.model.js";
import { encuestasRespuestasModel } from "../models/encuesta_respuesta.model.js";
import { categoriasModel } from "../models/categoria.model.js";
import { cursosModel } from "../models/cursos.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js";
import { usuariosModel } from "../models/usuario.model.js";
import { notificarAUsuarios } from "../utils/notificaciones.service.js";

const obtenerInstitucionDeRepresentante = async (usuarioReq) => {
  if (usuarioReq.institucion_id) return usuarioReq.institucion_id;
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: usuarioReq.id },
  });
  return representacion ? representacion.institucion_id : null;
};

// El representante crea una encuesta. Puede ser:
//  - tipo "Interes": para preguntar, antes de lanzar cursos, qué categoría de
//    capacitación le interesaría a la gente (categoria_id opcional).
//  - tipo "Satisfaccion": ligada a un curso puntual ya finalizado, para medir
//    si convendría relanzar esa capacitación (curso_id obligatorio).
export const crearEncuesta = async (req, res) => {
  try {
    const { titulo, categoria_id, curso_id, tipo } = req.body;
    if (!titulo)
      return res.status(400).json({ mensaje: "El título/pregunta es obligatorio" });

    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    if (!institucion_id)
      return res
        .status(400)
        .json({ mensaje: "Tu usuario no está vinculado a ninguna institución" });

    const tipoFinal = tipo === "Satisfaccion" ? "Satisfaccion" : "Interes";

    if (tipoFinal === "Satisfaccion") {
      if (!curso_id)
        return res
          .status(400)
          .json({ mensaje: "Una encuesta de satisfacción necesita un curso_id" });
      const curso = await cursosModel.findOne({ where: { id: curso_id, institucion_id } });
      if (!curso)
        return res
          .status(404)
          .json({ mensaje: "Ese curso no pertenece a tu institución" });
    }

    const encuesta = await encuestasModel.create({
      titulo,
      institucion_id,
      curso_id: tipoFinal === "Satisfaccion" ? curso_id : null,
      categoria_id: categoria_id || null,
      tipo: tipoFinal,
    });

    // Avisamos a los ciudadanos que la encuesta está disponible (mismo canal
    // de notificaciones que se usa para los cursos nuevos).
    const ciudadanos = await usuariosModel.findAll({
      where: { activo: true, acepta_notificaciones: true },
      include: [{ association: "rol", where: { nombre: "ciudadano" } }],
    });
    notificarAUsuarios({
      usuarios: ciudadanos,
      titulo: `Nueva encuesta: ${encuesta.titulo}`,
      mensaje:
        tipoFinal === "Interes"
          ? `Queremos saber qué capacitaciones te interesan. Respondé la encuesta "${encuesta.titulo}" desde la plataforma.`
          : `Contanos qué te pareció el curso respondiendo la encuesta "${encuesta.titulo}".`,
    }).catch((e) => console.error("Error notificando encuesta:", e.message));

    return res.status(201).json({ mensaje: "Encuesta creada", encuesta });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al crear la encuesta", error: error.message });
  }
};

// Encuestas activas, pensadas para que el ciudadano las responda (login opcional
// para verlas, pero se necesita estar logueado para responder).
export const verEncuestasActivas = async (req, res) => {
  try {
    const encuestas = await encuestasModel.findAll({
      where: { activo: true },
      include: [
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
      ],
      order: [["fecha_creacion", "DESC"]],
    });

    // Si hay sesión, marcamos cuáles ya respondió para no mostrárselas de nuevo
    if (req.usuario) {
      const respondidas = await encuestasRespuestasModel.findAll({
        where: { persona_id: req.usuario.persona_id },
        attributes: ["encuesta_id"],
      });
      const idsRespondidas = new Set(respondidas.map((r) => r.encuesta_id));
      encuestas.forEach((e) => {
        e.dataValues.yaRespondida = idsRespondidas.has(e.id);
      });
    }

    return res.status(200).json({ mensaje: "Encuestas activas", encuestas });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener encuestas", error: error.message });
  }
};

// Encuestas creadas por el representante logueado (para su panel)
export const verMisEncuestas = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const encuestas = await encuestasModel.findAll({
      where: { institucion_id },
      include: [
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
      ],
      order: [["fecha_creacion", "DESC"]],
    });
    return res.status(200).json({ mensaje: "Tus encuestas", encuestas });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tus encuestas", error: error.message });
  }
};

// El ciudadano responde una encuesta (texto libre, una sola vez)
export const responderEncuesta = async (req, res) => {
  try {
    const { respuesta } = req.body;
    const encuesta = await encuestasModel.findByPk(req.params.id);
    if (!encuesta || !encuesta.activo)
      return res.status(404).json({ mensaje: "Encuesta no encontrada o inactiva" });

    const yaRespondio = await encuestasRespuestasModel.findOne({
      where: { encuesta_id: encuesta.id, persona_id: req.usuario.persona_id },
    });
    if (yaRespondio)
      return res.status(409).json({ mensaje: "Ya respondiste esta encuesta" });

    const nuevaRespuesta = await encuestasRespuestasModel.create({
      encuesta_id: encuesta.id,
      persona_id: req.usuario.persona_id,
      respuesta: respuesta || null,
    });

    return res.status(201).json({ mensaje: "¡Gracias por responder!", respuesta: nuevaRespuesta });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ mensaje: "Ya respondiste esta encuesta" });
    }
    return res
      .status(500)
      .json({ mensaje: "Error al registrar tu respuesta", error: error.message });
  }
};

// Resultados de una encuesta (sólo el representante dueño)
export const verResultadosEncuesta = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const encuesta = await encuestasModel.findOne({
      where: { id: req.params.id, institucion_id },
      include: [{ model: encuestasRespuestasModel, as: "respuestas" }],
    });
    if (!encuesta)
      return res.status(404).json({ mensaje: "Encuesta no encontrada en tu institución" });

    return res.status(200).json({
      mensaje: "Resultados de la encuesta",
      encuesta: { id: encuesta.id, titulo: encuesta.titulo, tipo: encuesta.tipo },
      totalRespuestas: encuesta.respuestas.length,
      respuestas: encuesta.respuestas,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener resultados", error: error.message });
  }
};

export const cerrarEncuesta = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const [actualizados] = await encuestasModel.update(
      { activo: false },
      { where: { id: req.params.id, institucion_id } },
    );
    if (!actualizados)
      return res.status(404).json({ mensaje: "Encuesta no encontrada en tu institución" });
    return res.status(200).json({ mensaje: "Encuesta cerrada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al cerrar la encuesta", error: error.message });
  }
};
