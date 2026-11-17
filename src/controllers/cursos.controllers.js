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
import { docentesCursoModel, MAX_DOCENTES_POR_CURSO } from "../models/docente_curso.model.js";
import { certificadosModel } from "../models/certificado.model.js";
import { notificarNuevoCurso } from "../utils/notificaciones.service.js";
import { enviarEmail } from "../utils/email.service.js";
import { construirUrl } from "../config/appUrl.js";
import { escaparHtml } from "../utils/html.js";
import { construirUrlMapa } from "../utils/mapas.js"; // NUEVO: helper que arma la URL del mapa

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

// Fechas de cursado: vienen como "AAAA-MM-DD" (o vacías). Devuelve { inicio, fin, error }.
const leerFechasCurso = (body, actual = {}) => {
  const normalizar = (valor) => {
    if (valor === undefined) return undefined; // No vino: no se toca
    if (valor === null || String(valor).trim() === "") return null; // Vino vacía: se borra
    const texto = String(valor).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !isNaN(new Date(texto)) ? texto : "invalida";
  };
  const inicio = normalizar(body.fecha_inicio);
  const fin = normalizar(body.fecha_fin);
  if (inicio === "invalida" || fin === "invalida")
    return { error: "Las fechas del curso no tienen un formato válido" };
  const inicioFinal = inicio === undefined ? actual.fecha_inicio : inicio;
  const finFinal = fin === undefined ? actual.fecha_fin : fin;
  if (inicioFinal && finFinal && finFinal < inicioFinal)
    return { error: "La fecha de finalización no puede ser anterior a la de inicio" };
  return { inicio, fin };
};

// Ubicación propia del curso: texto de Google Maps y/o pin (latitud/longitud).
// Devuelve { cambios } con sólo los campos que llegaron, o { error }.
const leerUbicacionCurso = (body) => {
  const cambios = {};
  const vacio = (v) => v === null || v === undefined || String(v).trim() === "" || String(v) === "null";
  if (body.ubicacion_maps !== undefined) {
    const texto = String(body.ubicacion_maps ?? "").trim();
    if (texto.length > 2000) return { error: "La ubicación es demasiado larga" };
    if (texto && !construirUrlMapa(texto))
      return { error: 'Ingresá una dirección, coordenadas (ej: -26.1857, -58.1756) o el código de "Insertar un mapa" de Google Maps' };
    cambios.ubicacion_maps = texto || null;
  }
  if (body.latitud !== undefined || body.longitud !== undefined) {
    if (vacio(body.latitud) && vacio(body.longitud)) {
      cambios.latitud = null;
      cambios.longitud = null;
    } else {
      const lat = Number(body.latitud);
      const lng = Number(body.longitud);
      if (vacio(body.latitud) || vacio(body.longitud) || !Number.isFinite(lat) || !Number.isFinite(lng))
        return { error: "La latitud y la longitud deben ser números" };
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
        return { error: "Coordenadas fuera de rango (latitud -90 a 90, longitud -180 a 180)" };
      cambios.latitud = lat;
      cambios.longitud = lng;
    }
  }
  return { cambios };
};

// ------------------------------------------------------------------
// Requisitos de un curso. El representante los escribe (o toma una sugerencia)
// y llegan como lista de textos. Por compatibilidad también se aceptan ids.
// No existe una lista global visible: cada curso tiene los suyos y los que
// ningún curso usa se borran solos (limpiarRequisitosSinUso).
// ------------------------------------------------------------------
const MAX_REQUISITOS_POR_CURSO = 15;

function leerListaRequisitos(valor) {
  let lista = valor;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      lista = [];
    }
  }
  return Array.isArray(lista) ? lista : [];
}

async function guardarRequisitosDelCurso(cursoId, valor) {
  const ids = new Set();
  for (const item of leerListaRequisitos(valor).slice(0, MAX_REQUISITOS_POR_CURSO)) {
    if (typeof item === "number") { // Sólo los números son ids: un texto como "18 años" es un requisito escrito
      ids.add(Number(item)); // Formato viejo: id de un requisito existente
      continue;
    }
    const texto = String(item?.descripcion ?? item ?? "").trim().replace(/\s+/g, " ").slice(0, 255);
    if (texto.length < 3) continue;
    const [requisito] = await requisitosModel.findOrCreate({ where: { descripcion: texto } });
    ids.add(requisito.id);
  }
  await cursoRequisitoModel.destroy({ where: { curso_id: cursoId } });
  if (ids.size) {
    await cursoRequisitoModel.bulkCreate([...ids].map((requisito_id) => ({ curso_id: cursoId, requisito_id, es_obligatorio: true })));
  }
}

// Borra los requisitos que ya no usa ningún curso (así no se acumulan textos sueltos)
async function limpiarRequisitosSinUso() {
  await sequelize.query(
    "DELETE FROM requisitos WHERE id NOT IN (SELECT requisito_id FROM cursos_requisitos)",
  );
}

// ------------------------------------------------------------
// EQUIPO DOCENTE
// ------------------------------------------------------------
const incluirDocentes = {
  model: docentesCursoModel,
  as: "docentes",
  attributes: ["id", "nombre", "cargo", "biografia", "foto_url", "orden"],
  separate: true,
  order: [["orden", "ASC"], ["id", "ASC"]],
};

// Lee y valida la lista de docentes que manda el formulario (JSON). Devuelve { lista } o { error }.
// Cada docente: { nombre, cargo, biografia, foto_url (foto que ya tenía), foto_nueva (índice de la foto subida) }
function leerListaDocentes(valor, fotosNuevas = []) {
  let lista;
  try {
    lista = typeof valor === "string" ? JSON.parse(valor) : valor;
  } catch {
    return { error: "La lista de docentes no tiene un formato válido" };
  }
  if (!Array.isArray(lista)) return { error: "La lista de docentes no tiene un formato válido" };
  if (lista.length > MAX_DOCENTES_POR_CURSO) return { error: `Podés cargar hasta ${MAX_DOCENTES_POR_CURSO} docentes por curso` };

  const docentes = [];
  for (const [i, d] of lista.entries()) {
    const nombre = String(d?.nombre || "").trim().slice(0, 100);
    const cargo = String(d?.cargo || "").trim().slice(0, 100) || "Profesor";
    const biografia = String(d?.biografia || "").trim();
    if (!nombre) return { error: `Falta el nombre del docente ${i + 1}` };
    if (biografia.length > 1500) return { error: `La presentación de ${nombre} puede tener hasta 1500 caracteres` };

    let foto_url = null;
    if (Number.isInteger(d?.foto_nueva) && fotosNuevas[d.foto_nueva]) foto_url = fotosNuevas[d.foto_nueva];
    // Sólo se aceptan fotos que ya estén guardadas en el servidor (nunca un enlace externo)
    else if (typeof d?.foto_url === "string" && /^\/uploads\/docentes\/[\w.-]+$/.test(d.foto_url)) foto_url = d.foto_url;

    docentes.push({ nombre, cargo, biografia: biografia || null, foto_url, orden: i });
  }
  return { lista: docentes };
}

// Reemplaza el equipo docente completo del curso por la lista recibida
async function guardarDocentesDelCurso(cursoId, docentes) {
  await docentesCursoModel.destroy({ where: { curso_id: cursoId } });
  if (docentes.length) await docentesCursoModel.bulkCreate(docentes.map((d) => ({ ...d, curso_id: cursoId })));
}

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
    const fechas = leerFechasCurso(req.body);
    if (fechas.error) errores.push(fechas.error);
    const docentesLeidos = req.body.docentes !== undefined ? leerListaDocentes(req.body.docentes, req.fotos_docentes) : null;
    if (docentesLeidos?.error) errores.push(docentesLeidos.error);
    const ubicacion = leerUbicacionCurso(req.body);
    if (ubicacion.error) errores.push(ubicacion.error);

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

    // MODIFICADO: Si vino una imagen (guardada en el disco local, carpeta /uploads)
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
      fecha_inicio: fechas.inicio || null,
      fecha_fin: fechas.fin || null,
      imagen_url,
      institucion_id,
      ...ubicacion.cambios, // Ubicación propia de este curso (no toca a los demás cursos)
    });

    // Requisitos opcionales: lista de textos (o ids) en req.body.requisitos
    if (req.body.requisitos) {
      await guardarRequisitosDelCurso(curso.id, req.body.requisitos);
      await limpiarRequisitosSinUso();
    }
    if (docentesLeidos) await guardarDocentesDelCurso(curso.id, docentesLeidos.lista);

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
        incluirDocentes,
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
      await cursoRequisitoModel.destroy({ where: { curso_id: req.params.id } });
      await limpiarRequisitosSinUso();
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
    const { institucion_id: _ignorar, requisitos, docentes, ubicacion_maps: _u, latitud: _la, longitud: _lo, ...datos } = req.body;

    const curso = await cursosModel.findOne({
      where: { id: req.params.id, institucion_id },
    });
    if (!curso) {
      return res
        .status(404)
        .json({ mensaje: "curso no encontrado en tu institución" });
    }

    const fechas = leerFechasCurso(req.body, curso);
    if (fechas.error) return res.status(400).json({ mensaje: fechas.error });
    delete datos.fecha_inicio;
    delete datos.fecha_fin;
    if (fechas.inicio !== undefined) datos.fecha_inicio = fechas.inicio;
    if (fechas.fin !== undefined) datos.fecha_fin = fechas.fin;
    const docentesLeidos = docentes !== undefined ? leerListaDocentes(docentes, req.fotos_docentes) : null;
    if (docentesLeidos?.error) return res.status(400).json({ mensaje: docentesLeidos.error });
    const ubicacion = leerUbicacionCurso(req.body);
    if (ubicacion.error) return res.status(400).json({ mensaje: ubicacion.error });
    Object.assign(datos, ubicacion.cambios); // Sólo cambia la ubicación de ESTE curso

    if (req.imagen_url) datos.imagen_url = req.imagen_url;
    else if (req.file) datos.imagen_url = `/uploads/cursos/${req.file.filename}`;
    await curso.update(datos);

    // Si vino la lista de requisitos, la reemplazamos completa (permite
    // tanto agregar como sacar requisitos al editar).
    // Si vino la lista de requisitos, se reemplaza completa (permite agregar y sacar)
    if (requisitos !== undefined) {
      await guardarRequisitosDelCurso(curso.id, requisitos);
      await limpiarRequisitosSinUso();
    }
    if (docentesLeidos) await guardarDocentesDelCurso(curso.id, docentesLeidos.lista);

    const updateCurso = await cursosModel.findByPk(curso.id, {
      include: [incluirRequisitos, incluirDocentes],
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
          attributes: ["id", "nombre", "cuit", "ubicacion_maps", "latitud", "longitud"], // NUEVO: también trae la ubicación de la institución
        },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        {
          model: direccionesModel,
          as: "direccion_dictado",
          attributes: ["id", "calle", "numero", "barrio", "ciudad", "provincia"],
        },
        incluirRequisitos,
        incluirDocentes,
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
      // La ubicación es la PROPIA del curso. Sólo si el curso nunca tuvo una
      // (cursos viejos) se usa la de la institución como respaldo.
      const tienePropia = curso.ubicacion_maps || curso.latitud != null;
      const origen = tienePropia ? curso : curso.institucion || {};
      curso.dataValues.ubicacion_maps = origen.ubicacion_maps || null;
      curso.dataValues.mapa_embed_url = construirUrlMapa(origen.ubicacion_maps);
      curso.dataValues.latitud = origen.latitud == null ? null : Number(origen.latitud);
      curso.dataValues.longitud = origen.longitud == null ? null : Number(origen.longitud);
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
      attributes: ["id", "estado", "fecha_inscripcion", "contacto_verificado", "motivo_baja", "comentario_baja", "fecha_baja"],
      include: [
        {
          model: usuariosModel,
          as: "usuario",
          attributes: ["id", "email_login"],
          include: [
            {
              model: personasModel,
              as: "persona",
              attributes: ["nombre", "apellido", "dni", "telefono", "dni_verificado", "fecha_nacimiento", "avatar_url"],
            },
          ],
        },
        {
          model: certificadosModel,
          as: "certificado",
          attributes: ["id", "fecha_emision", "anulado", "codigo_verificacion"],
        },
      ],
      order: [["fecha_inscripcion", "ASC"]],
    });

    return res.status(200).json({
      mensaje: "Alumnos del curso",
      curso: {
        id: curso.id,
        titulo: curso.titulo,
        cupo_maximo: curso.cupo_maximo,
        modalidad: curso.modalidad,
        duracion_horas: curso.duracion_horas,
        fecha_inicio: curso.fecha_inicio,
        fecha_fin: curso.fecha_fin,
        imagen_url: curso.imagen_url,
      },
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

    const urlCurso = construirUrl(`detalles.html?id=${curso.id}`);
    const remitente = escaparHtml((nombre_remitente || "Alguien").trim().slice(0, 80));

    await enviarEmail({
      to: email_destino,
      subject: `${(nombre_remitente || "Alguien").toString().trim().slice(0, 80).replace(/[\r\n]/g, " ")} te recomendó un curso en AllCursos`,
      html: `
        <p>${remitente} pensó que este curso te podría interesar:</p>
        <h3>${escaparHtml(curso.titulo)}</h3>
        <p>Dictado por ${escaparHtml(curso.institucion?.nombre || "una institución adherida")}.</p>
        ${mensaje_personal ? `<p style="font-style: italic;">"${escaparHtml(String(mensaje_personal).slice(0, 500))}"</p>` : ""}
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
