import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { cursosModel } from "../models/cursos.model.js";
import { institucionesModel } from "../models/instituciones.model.js";
import { categoriasModel } from "../models/categoria.model.js";
import { direccionesModel } from "../models/direcciones.model.js";
import { inscripcionesModel } from "../models/inscripciones.model.js";
import { usuariosModel } from "../models/usuario.model.js";
import { personasModel } from "../models/persona.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js";
import { requisitosModel } from "../models/requisito.model.js";
import { cursoRequisitoModel } from "../models/curso_requisito.model.js";
import { reportesCursosModel } from "../models/reporte_curso.model.js";
import { cursoLikeModel } from "../models/curso_like.model.js";
import { notificarNuevoCurso } from "../utils/notificaciones.service.js";
import { enviarEmail } from "../utils/email.service.js";

// Devuelve el institucion_id del representante autenticado, ya sea que
// venga en el token o consultando la tabla intermedia como respaldo.
const obtenerInstitucionDeRepresentante = async (usuarioReq) => {
  if (usuarioReq.institucion_id) return usuarioReq.institucion_id;
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: usuarioReq.id },
  });
  return representacion ? representacion.institucion_id : null;
};

// Agrega a cada curso un campo virtual "cupos_disponibles"
const conCuposDisponibles = async (cursos) => {
  const lista = Array.isArray(cursos) ? cursos : [cursos];
  const ids = lista.map((c) => c.id);
  const conteos = await inscripcionesModel.findAll({
    attributes: [
      "curso_id",
      [sequelize.fn("COUNT", sequelize.col("id")), "total"],
    ],
    where: { curso_id: ids, estado: { [Op.ne]: "Cancelado" } },
    group: ["curso_id"],
  });
  const mapaConteos = {};
  conteos.forEach((c) => {
    mapaConteos[c.curso_id] = parseInt(c.get("total"), 10);
  });
  lista.forEach((curso) => {
    const inscriptos = mapaConteos[curso.id] || 0;
    curso.dataValues.inscriptos = inscriptos;
    curso.dataValues.cupos_disponibles = Math.max(
      curso.cupo_maximo - inscriptos,
      0,
    );
  });
  return cursos;
};

const incluirRequisitos = {
  model: requisitosModel,
  as: "requisitos",
  attributes: ["id", "descripcion"],
  through: { attributes: ["es_obligatorio"] },
};

export const agregarCursos = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      duracion_horas,
      categoria_id,
      direccion_dictado_id,
      modalidad,
      cupo_maximo,
      link_difusion_original,
    } = req.body;
    const errores = [];

    if (!titulo) errores.push("No puede estar sin titulo, ingresa un titulo");
    if (!descripcion)
      errores.push("Es obligatorio que tenga una descripcion el curso");
    if (!categoria_id) errores.push("Ingresa la categoría");
    if (!modalidad) errores.push("Modalidad obligatoria");
    if (!cupo_maximo) errores.push("Agrega el cupo maximo");

    // El curso siempre pertenece a la institución del representante logueado,
    // nunca se confía en un institucion_id enviado desde el cliente.
    const institucion_id = await obtenerInstitucionDeRepresentante(
      req.usuario,
    );
    if (!institucion_id)
      errores.push(
        "Tu usuario no está vinculado a ninguna institución representante",
      );

    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    // Regla de negocio: sólo representantes aprobados pueden publicar cursos
    const usuarioActual = await usuariosModel.findByPk(req.usuario.id, {
      include: [
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
    });

    if (usuarioActual && usuarioActual.estado_aprobacion !== "aprobado") {
      return res.status(403).json({
        mensaje:
          "Tu cuenta de representante está pendiente de aprobación por un administrador. Podrás publicar cursos una vez que sea aprobada.",
      });
    }

    if (
      usuarioActual?.representaciones?.[0]?.institucion?.estado_aprobacion &&
      usuarioActual.representaciones[0].institucion.estado_aprobacion !== "aprobado"
    ) {
      return res.status(403).json({
        mensaje:
          "Tu institución está pendiente de aprobación por un administrador.",
      });
    }

    // Si vino una imagen (subida a Cloudinary o guardada localmente)
    const imagen_url =
      req.imagen_url || (req.file ? `/uploads/cursos/${req.file.filename}` : null);

    const curso = await cursosModel.create({
      titulo,
      descripcion,
      duracion_horas: duracion_horas || null,
      categoria_id,
      direccion_dictado_id: direccion_dictado_id || null,
      modalidad,
      cupo_maximo,
      link_difusion_original: link_difusion_original || null,
      imagen_url,
      institucion_id,
    });

    // Requisitos opcionales: req.body.requisitos puede venir como JSON string
    // (form-data) o array (JSON puro) de ids, o de {requisito_id, es_obligatorio}
    if (req.body.requisitos) {
      let listaRequisitos = req.body.requisitos;
      if (typeof listaRequisitos === "string") {
        try {
          listaRequisitos = JSON.parse(listaRequisitos);
        } catch {
          listaRequisitos = [];
        }
      }
      if (Array.isArray(listaRequisitos) && listaRequisitos.length > 0) {
        const filas = listaRequisitos.map((r) =>
          typeof r === "object"
            ? {
                curso_id: curso.id,
                requisito_id: r.requisito_id,
                es_obligatorio: r.es_obligatorio !== false,
              }
            : { curso_id: curso.id, requisito_id: r, es_obligatorio: true },
        );
        await cursoRequisitoModel.bulkCreate(filas);
      }
    }

    // Se dispara en segundo plano: no hace falta que el representante espere
    // a que se les mande el mail a todos los ciudadanos para recibir su respuesta.
    notificarNuevoCurso(curso).catch((e) =>
      console.error("Error notificando nuevo curso:", e.message),
    );

    return res
      .status(201)
      .json({ mensaje: "Curso agregado correctamente", curso });
  } catch (error) {
    return res.status(500).json({
      mensaje: "error al poder agregar en la base de datos",
      error: error.message,
    });
  }
};

// Listado público de cursos, con filtros opcionales por categoría, institución y texto libre
export const verTodosCursos = async (req, res) => {
  try {
    const { categoria_id, institucion_id, q } = req.query;
    const where = {};
    if (categoria_id) where.categoria_id = categoria_id;
    if (institucion_id) where.institucion_id = institucion_id;
    if (q) {
      where[Op.or] = [
        { titulo: { [Op.like]: `%${q}%` } },
        { descripcion: { [Op.like]: `%${q}%` } },
      ];
    }
    const cursos = await cursosModel.findAll({
      where,
      include: [
        {
          model: institucionesModel,
          as: "institucion",
          attributes: ["id", "nombre", "cuit"],
        },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        {
          model: direccionesModel,
          as: "direccion_dictado",
          attributes: ["id", "calle", "ciudad", "provincia"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
    await conCuposDisponibles(cursos);
    return res
      .status(200)
      .json({ mensaje: "Estos son todos los cursos", cursos });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error en poder ver todo cursos",
      error: error.message,
    });
  }
};

// Cursos de la institución del representante logueado (para su panel)
export const verMisCursos = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(
      req.usuario,
    );
    if (!institucion_id)
      return res
        .status(400)
        .json({ mensaje: "Tu usuario no está vinculado a ninguna institución" });

    const cursos = await cursosModel.findAll({
      where: { institucion_id },
      include: [
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        incluirRequisitos,
      ],
      order: [["created_at", "DESC"]],
    });
    await conCuposDisponibles(cursos);
    return res.status(200).json({ mensaje: "Tus cursos", cursos });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tus cursos", error: error.message });
  }
};

export const borrarCursos = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(
      req.usuario,
    );
    const eliminarCursos = await cursosModel.destroy({
      where: { id: req.params.id, institucion_id },
    });
    if (eliminarCursos) {
      return res.status(200).json({ mensaje: "curso eliminado con exito" });
    } else {
      return res
        .status(404)
        .json({ mensaje: "no se encontró este curso en tu institución" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al borrar el curso", error: error.message });
  }
};

export const editarCursos = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(
      req.usuario,
    );
    // No permitimos cambiar el curso de institución desde este endpoint
    const { institucion_id: _ignorar, requisitos, ...datos } = req.body;

    const curso = await cursosModel.findOne({
      where: { id: req.params.id, institucion_id },
    });
    if (!curso) {
      return res
        .status(404)
        .json({ mensaje: "curso no encontrado en tu institución" });
    }

    if (req.imagen_url) datos.imagen_url = req.imagen_url;
    else if (req.file) datos.imagen_url = `/uploads/cursos/${req.file.filename}`;
    await curso.update(datos);

    // Si vino la lista de requisitos, la reemplazamos completa (permite
    // tanto agregar como sacar requisitos al editar).
    if (requisitos !== undefined) {
      let listaRequisitos = requisitos;
      if (typeof listaRequisitos === "string") {
        try {
          listaRequisitos = JSON.parse(listaRequisitos);
        } catch {
          listaRequisitos = [];
        }
      }
      await cursoRequisitoModel.destroy({ where: { curso_id: curso.id } });
      if (Array.isArray(listaRequisitos) && listaRequisitos.length > 0) {
        const filas = listaRequisitos.map((r) => ({
          curso_id: curso.id,
          requisito_id: r,
          es_obligatorio: true,
        }));
        await cursoRequisitoModel.bulkCreate(filas);
      }
    }

    const updateCurso = await cursosModel.findByPk(curso.id, {
      include: [incluirRequisitos],
    });
    return res.status(200).json({ mensaje: "curso actualizado", updateCurso });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "error al poder editar cursos", error: error.message });
  }
};

export const verPorIdCursos = async (req, res) => {
  try {
    const curso = await cursosModel.findByPk(req.params.id, {
      include: [
        {
          model: institucionesModel,
          as: "institucion",
          attributes: ["id", "nombre", "cuit"],
        },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        {
          model: direccionesModel,
          as: "direccion_dictado",
          attributes: ["id", "calle", "numero", "barrio", "ciudad", "provincia"],
        },
        incluirRequisitos,
      ],
    });
    if (curso) {
      await conCuposDisponibles(curso);
      // tokenOpcional: si vino sesión, indicamos si esta cuenta ya le dio
      // like, para que el frontend pinte el botón activo.
      if (req.usuario) {
        const yaLikeado = await cursoLikeModel.findOne({
          where: { curso_id: curso.id, usuario_id: req.usuario.id },
        });
        curso.dataValues.yaMeGusta = !!yaLikeado;
      } else {
        curso.dataValues.yaMeGusta = false;
      }
      return res.status(200).json({ mensaje: "curso encontrado", curso });
    } else {
      return res.status(404).json({ mensaje: "curso no encontrado" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "error al ver por id cursos", error: error.message });
  }
};

// Alumnos inscriptos en un curso, con sus datos, para el panel del representante.
// Verifica que el curso pertenezca a la institución del representante logueado.
export const verAlumnosPorCurso = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(
      req.usuario,
    );
    const curso = await cursosModel.findOne({
      where: { id: req.params.id, institucion_id },
    });
    if (!curso)
      return res
        .status(404)
        .json({ mensaje: "curso no encontrado en tu institución" });

    const inscripciones = await inscripcionesModel.findAll({
      where: { curso_id: curso.id },
      attributes: ["id", "estado", "fecha_inscripcion", "contacto_verificado"],
      include: [
        {
          model: usuariosModel,
          as: "usuario",
          attributes: ["id", "email_login"],
          include: [
            {
              model: personasModel,
              as: "persona",
              attributes: ["nombre", "apellido", "dni", "telefono", "dni_verificado", "fecha_nacimiento"],
            },
          ],
        },
      ],
      order: [["fecha_inscripcion", "ASC"]],
    });

    return res.status(200).json({
      mensaje: "Alumnos del curso",
      curso: { id: curso.id, titulo: curso.titulo, cupo_maximo: curso.cupo_maximo },
      inscripciones,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener los alumnos", error: error.message });
  }
};

// Agregar requisitos a un curso ya existente (sólo el representante dueño)
export const agregarRequisitosACurso = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const curso = await cursosModel.findOne({
      where: { id: req.params.id, institucion_id },
    });
    if (!curso)
      return res
        .status(404)
        .json({ mensaje: "curso no encontrado en tu institución" });

    const { requisitos } = req.body; // [{ requisito_id, es_obligatorio }]
    if (!Array.isArray(requisitos) || requisitos.length === 0)
      return res.status(400).json({ mensaje: "Debes enviar al menos un requisito" });

    const filas = requisitos.map((r) => ({
      curso_id: curso.id,
      requisito_id: r.requisito_id,
      es_obligatorio: r.es_obligatorio !== false,
    }));
    await cursoRequisitoModel.bulkCreate(filas, { ignoreDuplicates: true });

    const cursoActualizado = await cursosModel.findByPk(curso.id, {
      include: [incluirRequisitos],
    });
    return res.status(200).json({
      mensaje: "Requisitos agregados",
      requisitos: cursoActualizado.requisitos,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al agregar requisitos", error: error.message });
  }
};

// Reportar un curso sospechoso, engañoso o inapropiado
export const reportarCurso = async (req, res) => {
  try {
    const curso_id = req.params.id;
    const { motivo, descripcion, email_contacto } = req.body;

    if (!motivo || !descripcion) {
      return res
        .status(400)
        .json({ mensaje: "El motivo y la descripción son obligatorios" });
    }

    const curso = await cursosModel.findByPk(curso_id);
    if (!curso) {
      return res.status(404).json({ mensaje: "El curso no existe" });
    }

    const usuario_id = req.usuario ? req.usuario.id : null;
    const emailFinal = req.usuario ? req.usuario.email_login : email_contacto;

    const reporte = await reportesCursosModel.create({
      curso_id,
      usuario_id,
      email_contacto: emailFinal || null,
      motivo,
      descripcion,
      estado: "pendiente",
    });

    return res.status(201).json({
      mensaje:
        "Reporte recibido correctamente. El equipo de administración revisará el contenido.",
      reporte_id: reporte.id,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al registrar el reporte del curso",
      error: error.message,
    });
  }
};


// ============================================================
// "ME GUSTA" — requiere estar logueado (como ciudadano). El contador es
// visible para cualquiera, pero para votar hay que tener cuenta: así un
// usuario sólo puede dar like una vez por curso (tabla curso_likes), y no
// se puede "hacer trampa" limpiando el localStorage del navegador.
// ============================================================
export const darLikeCurso = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const curso = await cursosModel.findByPk(req.params.id, { transaction: t });
    if (!curso) {
      await t.rollback();
      return res.status(404).json({ mensaje: "Curso no encontrado" });
    }

    const [, creado] = await cursoLikeModel.findOrCreate({
      where: { curso_id: curso.id, usuario_id: req.usuario.id },
      transaction: t,
    });

    if (!creado) {
      await t.rollback();
      return res.status(409).json({
        mensaje: "Ya le diste me gusta a este curso",
        likes_count: curso.likes_count,
        yaMeGusta: true,
      });
    }

    await curso.increment("likes_count", { transaction: t });
    await t.commit();
    await curso.reload();

    return res
      .status(200)
      .json({ mensaje: "¡Gracias!", likes_count: curso.likes_count, yaMeGusta: true });
  } catch (error) {
    await t.rollback();
    return res
      .status(500)
      .json({ mensaje: "Error al registrar el me gusta", error: error.message });
  }
};

export const quitarLikeCurso = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const curso = await cursosModel.findByPk(req.params.id, { transaction: t });
    if (!curso) {
      await t.rollback();
      return res.status(404).json({ mensaje: "Curso no encontrado" });
    }

    const like = await cursoLikeModel.findOne({
      where: { curso_id: curso.id, usuario_id: req.usuario.id },
      transaction: t,
    });
    if (!like) {
      await t.rollback();
      return res.status(200).json({
        mensaje: "No tenías un me gusta registrado en este curso",
        likes_count: curso.likes_count,
        yaMeGusta: false,
      });
    }

    await like.destroy({ transaction: t });
    if (curso.likes_count > 0) await curso.decrement("likes_count", { transaction: t });
    await t.commit();
    await curso.reload();

    return res
      .status(200)
      .json({ mensaje: "Listo", likes_count: curso.likes_count, yaMeGusta: false });
  } catch (error) {
    await t.rollback();
    return res
      .status(500)
      .json({ mensaje: "Error al quitar el me gusta", error: error.message });
  }
};

// ============================================================
// RECOMENDAR UN CURSO POR EMAIL — no requiere login. Reutiliza
// el servicio de email que ya usamos para notificaciones y
// recuperación de contraseña.
// ============================================================
export const recomendarCurso = async (req, res) => {
  try {
    const { email_destino, nombre_remitente, mensaje_personal } = req.body;

    if (!email_destino || !/^\S+@\S+\.\S+$/.test(email_destino)) {
      return res.status(400).json({ mensaje: "Ingresá un email de destino válido" });
    }

    const curso = await cursosModel.findByPk(req.params.id, {
      include: [{ model: institucionesModel, as: "institucion", attributes: ["nombre"] }],
    });
    if (!curso) return res.status(404).json({ mensaje: "Curso no encontrado" });

    const urlCurso = `${process.env.FRONTEND_URL || "http://localhost:3000"}/detalles.html?id=${curso.id}`;
    const remitente = (nombre_remitente || "Alguien").trim();

    await enviarEmail({
      to: email_destino,
      subject: `${remitente} te recomendó un curso en AllCursos`,
      html: `
        <p>${remitente} pensó que este curso te podría interesar:</p>
        <h3>${curso.titulo}</h3>
        <p>Dictado por ${curso.institucion?.nombre || "una institución adherida"}.</p>
        ${mensaje_personal ? `<p style="font-style: italic;">"${mensaje_personal}"</p>` : ""}
        <p><a href="${urlCurso}">Ver el curso y anotarme</a></p>
      `,
    });

    return res.status(200).json({ mensaje: "¡Recomendación enviada con éxito!" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al enviar la recomendación", error: error.message });
  }
};
