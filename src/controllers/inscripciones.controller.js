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
import { listaEsperaModel } from "../models/lista_espera.model.js";
import { notificarAUsuarios } from "../utils/notificaciones.service.js";
import { verificacionValida } from "./verificacion.controller.js";
import { verificarDNI } from "../utils/dni.service.js";

// Crea (si hace falta) al ciudadano invitado que se inscribe sin haber
// iniciado sesión, dentro de la misma transacción de la inscripción.
const obtenerOCrearUsuarioInvitado = async (datos, t) => {
  const { nombre, apellido, dni, email, telefono, password } = datos;
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
    { nombre, apellido, dni, telefono: telefono || null, direccion_id: null },
    { transaction: t },
  );

  // Se dispara en segundo plano (no bloquea la respuesta): consulta si el DNI
  // existe en algún padrón externo, cuando haya uno configurado (ver
  // src/utils/dni.service.js). Hoy por defecto queda "Sin_verificar".
  verificarDNI(dni, { nombre, apellido })
    .then((resultado) => persona.update({ dni_verificado: resultado.estado }))
    .catch((e) => console.error("Error al verificar DNI:", e.message));

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
      acepta_notificaciones: true,
    },
    { transaction: t },
  );

  return { usuario, persona, claveGenerada: claveDefinitiva === dni };
};

export const agregarInscripciones = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { curso_id } = req.body;
    if (!curso_id) {
      await t.rollback();
      return res.status(400).json({ mensaje: "Debe ingresar el id del curso" });
    }

    // Regla de negocio: representantes (y administradores) no se inscriben a
    // cursos, esa funcionalidad es exclusiva de los ciudadanos.
    if (req.usuario && req.usuario.rol !== "ciudadano") {
      await t.rollback();
      return res.status(403).json({
        mensaje:
          "Los representantes de instituciones no pueden inscribirse a cursos",
      });
    }

    const curso = await cursosModel.findByPk(curso_id, { transaction: t });
    if (!curso) {
      await t.rollback();
      return res.status(404).json({ mensaje: "El curso no existe" });
    }

    let usuarioId;
    let personaId;
    let claveGenerada = false;
    let contactoVerificado = false;

    if (req.usuario) {
      // Login opcional: si ya está logueado, usamos su sesión directamente
      usuarioId = req.usuario.id;
      personaId = req.usuario.persona_id;
    } else {
      // A los invitados (sin sesión) se les exige haber verificado un
      // código enviado a su email o teléfono, para reducir inscripciones
      // con datos falsos o inexistentes.
      const { verificacion_id, medio_verificacion, email, telefono } = req.body;
      const valorAVerificar = medio_verificacion === "Telefono" ? telefono : email;

      const esValida = await verificacionValida(verificacion_id, valorAVerificar);
      if (!esValida) {
        await t.rollback();
        return res.status(400).json({
          mensaje:
            "Necesitás verificar tu email o teléfono con el código antes de poder inscribirte.",
          requiereVerificacion: true,
        });
      }
      contactoVerificado = true;

      const resultado = await obtenerOCrearUsuarioInvitado(req.body, t);
      if (resultado.errores) {
        await t.rollback();
        return res.status(400).json({ errores: resultado.errores });
      }
      usuarioId = resultado.usuario.id;
      personaId = resultado.persona.id;
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
    const yaEnEspera = await listaEsperaModel.findOne({
      where: { curso_id, persona_id: personaId },
      transaction: t,
    });
    if (yaEnEspera) {
      await t.rollback();
      return res
        .status(409)
        .json({ mensaje: "Ya te encuentras en la lista de espera de este curso" });
    }

    const inscriptosActivos = await inscripcionesModel.count({
      where: { curso_id, estado: { [Op.ne]: "Cancelado" } },
      transaction: t,
    });

    // Si no hay cupo, en vez de crear una inscripción se anota a la persona
    // en la tabla `lista_espera`. Cuando alguien cancela su lugar, la primera
    // persona en la lista es promovida automáticamente (ver promoverListaEspera).
    if (inscriptosActivos >= curso.cupo_maximo) {
      await listaEsperaModel.create(
        { curso_id, persona_id: personaId },
        { transaction: t },
      );
      await t.commit();
      return res.status(201).json({
        mensaje:
          "El curso no tiene cupos disponibles. Quedaste anotado en la lista de espera y te avisaremos si se libera un lugar.",
        listaEspera: true,
        ...(claveGenerada
          ? {
              aviso:
                "Se creó una cuenta para vos usando tu DNI como contraseña provisoria. Podés cambiarla luego de iniciar sesión.",
            }
          : {}),
      });
    }

    const inscripcion = await inscripcionesModel.create(
      { usuario_id: usuarioId, curso_id, estado: "Inscripto", contacto_verificado: contactoVerificado },
      { transaction: t },
    );

    await t.commit();

    return res.status(201).json({
      mensaje: "Inscripción registrada correctamente",
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

// Cuando se libera un cupo (una inscripción pasa a "Cancelado"), promueve
// automáticamente a la primera persona anotada en la lista de espera.
async function promoverListaEspera(curso_id) {
  const siguiente = await listaEsperaModel.findOne({
    where: { curso_id, notificado: false },
    order: [["fecha_registro", "ASC"]],
    include: [{ model: personasModel, as: "persona", include: [{ model: usuariosModel, as: "usuario" }] }],
  });
  if (!siguiente || !siguiente.persona?.usuario) return;

  const usuario = siguiente.persona.usuario;

  await inscripcionesModel.create({
    usuario_id: usuario.id,
    curso_id,
    estado: "Inscripto",
  });
  await siguiente.destroy();

  const curso = await cursosModel.findByPk(curso_id);
  await notificarAUsuarios({
    usuarios: [usuario],
    titulo: `¡Se liberó un cupo en "${curso.titulo}"!`,
    mensaje: `Se liberó un lugar en el curso "${curso.titulo}" y quedaste inscripto automáticamente.`,
    curso_id,
  });
}

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

    const persona_id = req.usuario.persona_id;
    const listaEspera = await listaEsperaModel.findAll({
      where: { persona_id },
      include: [{ model: cursosModel, as: "curso" }],
      order: [["fecha_registro", "DESC"]],
    });

    return res
      .status(200)
      .json({ mensaje: "Mis inscripciones", inscripciones, listaEspera });
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

    // Si se liberó un cupo, promovemos a quien corresponda de la lista de espera
    if (estado === "Cancelado") {
      promoverListaEspera(inscripcion.curso_id).catch((e) =>
        console.error("Error al promover lista de espera:", e.message),
      );
    }

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
