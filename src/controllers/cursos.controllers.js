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
    const curso = await cursosModel.create({
      titulo,
      descripcion,
      duracion_horas,
      categoria_id,
      direccion_dictado_id: direccion_dictado_id || null,
      modalidad,
      cupo_maximo,
      link_difusion_original: link_difusion_original || null,
      institucion_id,
    });
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
    const { institucion_id: _ignorar, ...datos } = req.body;
    const [actualizarCursos] = await cursosModel.update(datos, {
      where: { id: req.params.id, institucion_id },
    });
    if (actualizarCursos) {
      const updateCurso = await cursosModel.findByPk(req.params.id);
      return res.status(200).json({ mensaje: "curso actualizado", updateCurso });
    } else {
      return res
        .status(404)
        .json({ mensaje: "curso no encontrado en tu institución" });
    }
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
      ],
    });
    if (curso) {
      await conCuposDisponibles(curso);
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
      include: [
        {
          model: usuariosModel,
          as: "usuario",
          attributes: ["id", "email_login"],
          include: [
            {
              model: personasModel,
              as: "persona",
              attributes: ["nombre", "apellido", "dni", "fecha_nacimiento"],
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
