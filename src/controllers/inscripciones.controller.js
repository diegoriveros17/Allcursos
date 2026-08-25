import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { inscripcionesModel } from "../models/inscripciones.model.js";
import { usuariosModel } from "../models/usuario.model.js";
import { personasModel } from "../models/persona.model.js";
import { rolesModel } from "../models/rol.model.js";
import { cursosModel } from "../models/cursos.model.js";
import { institucionesModel } from "../models/instituciones.model.js";
import { certificadosModel } from "../models/certificado.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js";

// Crea (si hace falta) al ciudadano invitado que se inscribe sin haber
// iniciado sesión, dentro de la misma transacción de la inscripción.
const obtenerOCrearUsuarioInvitado = async (datos, t) => {
  const { nombre, apellido, dni, email, password, direccion_texto } = datos;
  const errores = [];
  if (!nombre) errores.push("El nombre es obligatorio");
  if (!apellido) errores.push("El apellido es obligatorio");
  if (!dni) errores.push("El DNI es obligatorio");
  if (!email) errores.push("El email es obligatorio");
  if (errores.length > 0) return { errores };

  const existente = await usuariosModel.findOne({
    where: { email_login: email },
    transaction: t,
  });
  if (existente) {
    return {
      errores: [
        "Ese email ya está registrado. Inicia sesión para inscribirte con esa cuenta.",
      ],
    };
  }

  const rolCiudadano = await rolesModel.findOne({
    where: { nombre: "ciudadano" },
    transaction: t,
  });

  const persona = await personasModel.create(
    { nombre, apellido, dni, direccion_id: null },
    { transaction: t },
  );

  // Si no definió contraseña, se genera una y se le informa por respuesta
  // para que pueda iniciar sesión más adelante y ver sus cursos.
  const claveDefinitiva = password && password.length >= 4 ? password : dni;
  const passwordHash = await bcrypt.hash(claveDefinitiva, 10);

  const usuario = await usuariosModel.create(
    {
      persona_id: persona.id,
      rol_id: rolCiudadano.id,
      email_login: email,
      password_hash: passwordHash,
    },
    { transaction: t },
  );

  return { usuario, claveGenerada: claveDefinitiva === dni };
};

export const agregarInscripciones = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { curso_id } = req.body;
    if (!curso_id) {
      await t.rollback();
      return res.status(400).json({ mensaje: "Debe ingresar el id del curso" });
    }

    const curso = await cursosModel.findByPk(curso_id, { transaction: t });
    if (!curso) {
      await t.rollback();
      return res.status(404).json({ mensaje: "El curso no existe" });
    }

    let usuarioId;
    let claveGenerada = false;

    if (req.usuario) {
      // Login opcional: si ya está logueado, usamos su sesión directamente
      usuarioId = req.usuario.id;
    } else {
      const resultado = await obtenerOCrearUsuarioInvitado(req.body, t);
      if (resultado.errores) {
        await t.rollback();
        return res.status(400).json({ errores: resultado.errores });
      }
      usuarioId = resultado.usuario.id;
      claveGenerada = resultado.claveGenerada;
    }

    const yaInscripto = await inscripcionesModel.findOne({
      where: { usuario_id: usuarioId, curso_id },
      transaction: t,
    });
    if (yaInscripto) {
      await t.rollback();
      return res
        .status(409)
        .json({ mensaje: "Ya te encuentras inscripto en este curso" });
    }

    const inscriptosActivos = await inscripcionesModel.count({
      where: { curso_id, estado: { [Op.ne]: "Cancelado" } },
      transaction: t,
    });
    const estado =
      inscriptosActivos < curso.cupo_maximo ? "Inscripto" : "En espera";

    const inscripcion = await inscripcionesModel.create(
      { usuario_id: usuarioId, curso_id, estado },
      { transaction: t },
    );

    await t.commit();

    return res.status(201).json({
      mensaje:
        estado === "Inscripto"
          ? "Inscripción registrada correctamente"
          : "El curso no tiene cupos disponibles, quedaste en lista de espera",
      inscripcion,
      ...(claveGenerada
        ? {
            aviso:
              "Se creó una cuenta para vos usando tu DNI como contraseña provisoria. Podés cambiarla luego de iniciar sesión.",
          }
        : {}),
    });
  } catch (error) {
    await t.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ mensaje: "Ya te encuentras inscripto en este curso" });
    }
    return res
      .status(500)
      .json({ mensaje: "Error al procesar inscripción", error: error.message });
  }
};

// Cursos del usuario logueado (dashboard del ciudadano)
export const verMisInscripciones = async (req, res) => {
  try {
    const inscripciones = await inscripcionesModel.findAll({
      where: { usuario_id: req.usuario.id },
      include: [
        {
          model: cursosModel,
          as: "curso",
          include: [
            { model: institucionesModel, as: "institucion", attributes: ["nombre"] },
          ],
        },
        { model: certificadosModel, as: "certificado" },
      ],
      order: [["fecha_inscripcion", "DESC"]],
    });
    return res.status(200).json({ mensaje: "Mis inscripciones", inscripciones });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tus cursos", error: error.message });
  }
};

export const verTodasInscripciones = async (req, res) => {
  try {
    const inscripciones = await inscripcionesModel.findAll({
      include: [
        { model: usuariosModel, as: "usuario" },
        { model: cursosModel, as: "curso" },
      ],
    });
    return res
      .status(200)
      .json({ mensaje: "Lista de inscripciones", inscripciones });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener inscripciones", error: error.message });
  }
};

export const verPorIdInscripciones = async (req, res) => {
  try {
    const inscripcion = await inscripcionesModel.findByPk(req.params.id, {
      include: [
        { model: usuariosModel, as: "usuario" },
        { model: cursosModel, as: "curso" },
      ],
    });
    if (!inscripcion)
      return res.status(404).json({ mensaje: "Inscripción no encontrada" });
    return res.status(200).json({ mensaje: "Inscripción encontrada", inscripcion });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al ver inscripción", error: error.message });
  }
};

export const borrarInscripciones = async (req, res) => {
  try {
    const eliminados = await inscripcionesModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Inscripción no encontrada" });
    return res
      .status(200)
      .json({ mensaje: "Inscripción eliminada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar inscripción", error: error.message });
  }
};

// El representante puede cambiar el estado (ej. marcar "Finalizado") si el
// curso es de su institución. El propio ciudadano sólo puede cancelarse.
export const editarInscripciones = async (req, res) => {
  try {
    const inscripcion = await inscripcionesModel.findByPk(req.params.id, {
      include: [{ model: cursosModel, as: "curso" }],
    });
    if (!inscripcion)
      return res.status(404).json({ mensaje: "Inscripción no encontrada" });

    const esDueño = req.usuario.rol === "ciudadano" && inscripcion.usuario_id === req.usuario.id;
    let esRepresentanteDelCurso = false;
    if (req.usuario.rol === "representante") {
      const representacion = await representanteInstituModel.findOne({
        where: { usuario_id: req.usuario.id, institucion_id: inscripcion.curso.institucion_id },
      });
      esRepresentanteDelCurso = !!representacion;
    }

    if (!esDueño && !esRepresentanteDelCurso) {
      return res
        .status(403)
        .json({ mensaje: "No tienes permisos para modificar esta inscripción" });
    }

    let { estado } = req.body;
    if (esDueño && !esRepresentanteDelCurso) {
      // Un ciudadano únicamente puede cancelar su propia inscripción
      estado = "Cancelado";
    }

    const [actualizados] = await inscripcionesModel.update(
      { estado },
      { where: { id: req.params.id } },
    );
    if (!actualizados)
      return res.status(404).json({ mensaje: "Inscripción no encontrada" });
    const inscripcionActualizada = await inscripcionesModel.findByPk(req.params.id);
    return res
      .status(200)
      .json({ mensaje: "Inscripción actualizada", inscripcionActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar inscripción", error: error.message });
  }
};
