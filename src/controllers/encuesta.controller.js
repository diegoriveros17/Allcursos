import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  encuestasIdeasModel,
  encuestasIdeasVotosModel,
  inscripcionesModel,
  encuestasModel,
  encuestasPreguntasModel,
  encuestasRespuestasModel,
  encuestasRespuestasDetalleModel,
  categoriasModel,
  cursosModel,
  institucionesModel,
  representanteInstituModel,
  usuariosModel,
} from "../models/index.js";
import { notificarAUsuarios, notificarRepresentantes } from "../utils/notificaciones.service.js";

const obtenerInstitucionDeRepresentante = async (usuarioReq) => {
  if (usuarioReq.institucion_id) return usuarioReq.institucion_id;
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: usuarioReq.id },
  });
  return representacion ? representacion.institucion_id : null;
};

// ============================================================
// VALIDACIÓN DE PREGUNTAS (creación de la encuesta)
// ============================================================
const TIPOS_PREGUNTA = ["opcion_multiple", "texto_abierto", "rating"];
const ESCALAS_VALIDAS = [3, 5, 7, 10];
const MAX_PREGUNTAS = 30;
const MAX_OPCIONES = 12;

const aBooleano = (v) => v === true || v === "true" || v === 1 || v === "1";

// Recibe lo que mandó el front y devuelve { errores, limpias }.
// Nunca se confía en el cliente: acá se normaliza todo antes de guardar.
export function validarPreguntas(entrada) {
  const errores = [];
  const limpias = [];

  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { errores: ["Agregá al menos una pregunta"], limpias };
  }
  if (entrada.length > MAX_PREGUNTAS) {
    return { errores: [`Una encuesta puede tener hasta ${MAX_PREGUNTAS} preguntas`], limpias };
  }

  entrada.forEach((p, i) => {
    const n = i + 1;
    const texto = String(p?.texto ?? "").trim();
    if (!texto) return errores.push(`La pregunta ${n} no tiene texto`);
    if (texto.length > 300) return errores.push(`La pregunta ${n} supera los 300 caracteres`);
    if (!TIPOS_PREGUNTA.includes(p?.tipo)) return errores.push(`La pregunta ${n} tiene un tipo inválido`);

    const pregunta = {
      texto,
      tipo: p.tipo,
      opciones: [],
      escala_max: 5,
      permite_justificacion: false,
      obligatoria: p.obligatoria === undefined ? true : aBooleano(p.obligatoria),
      orden: i,
    };

    if (p.tipo === "opcion_multiple") {
      const opciones = [
        ...new Set(
          (Array.isArray(p.opciones) ? p.opciones : [])
            .map((o) => String(o ?? "").trim())
            .filter(Boolean),
        ),
      ];
      if (opciones.length < 2) return errores.push(`La pregunta ${n} necesita al menos 2 opciones distintas`);
      if (opciones.length > MAX_OPCIONES) return errores.push(`La pregunta ${n} admite hasta ${MAX_OPCIONES} opciones`);
      if (opciones.some((o) => o.length > 150)) return errores.push(`Una opción de la pregunta ${n} supera los 150 caracteres`);
      pregunta.opciones = opciones;
      pregunta.permite_justificacion = aBooleano(p.permite_justificacion);
    } else if (p.tipo === "rating") {
      const escala = Number(p.escala_max ?? 5);
      if (!ESCALAS_VALIDAS.includes(escala)) {
        return errores.push(`La escala de la pregunta ${n} debe ser ${ESCALAS_VALIDAS.join(", ")}`);
      }
      pregunta.escala_max = escala;
      pregunta.permite_justificacion = aBooleano(p.permite_justificacion);
    }

    limpias.push(pregunta);
  });

  return { errores, limpias };
}

// ============================================================
// VIGENCIA Y ALCANCE
// - Las encuestas son temporales: se pueden responder mientras estén activas
//   y (si tienen fecha_cierre) hasta esa fecha inclusive.
// - "Satisfaccion" = encuesta DE UN CURSO: sólo la ven los alumnos de ese curso.
// - "Interes"      = encuesta GENERAL: la ven todos los estudiantes y puede
//   tener ideas de cursos para votar (nuevos o para traer de vuelta).
// ============================================================
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const estaVigente = (e) => !!e.activo && (!e.fecha_cierre || String(e.fecha_cierre).slice(0, 10) >= hoyISO());
const condicionVigente = () => ({
  activo: true,
  [Op.or]: [{ fecha_cierre: null }, { fecha_cierre: { [Op.gte]: hoyISO() } }],
});
// Alumnos que pueden responder la encuesta de su curso (los que lo están cursando o lo terminaron)
const ESTADOS_ALUMNO = ["Inscripto", "Cursando", "Finalizado"];

const idsCursosDelAlumno = async (usuario_id) => {
  const inscripciones = await inscripcionesModel.findAll({
    where: { usuario_id, estado: { [Op.in]: ESTADOS_ALUMNO } },
    attributes: ["curso_id"],
  });
  return [...new Set(inscripciones.map((i) => i.curso_id))];
};

// ¿Este ciudadano puede ver/responder esta encuesta?
const puedeParticipar = async (encuesta, usuarioReq) => {
  if (!estaVigente(encuesta)) return false;
  if (encuesta.tipo !== "Satisfaccion") return true;
  const inscripto = await inscripcionesModel.findOne({
    where: { usuario_id: usuarioReq.id, curso_id: encuesta.curso_id, estado: { [Op.in]: ESTADOS_ALUMNO } },
    attributes: ["id"],
  });
  return !!inscripto;
};

const MAX_IDEAS = 20;
const MAX_VOTOS_POR_PERSONA = 3; // Cada estudiante puede apoyar hasta 3 ideas por encuesta
const MAX_PROPUESTAS_POR_PERSONA = 2;

// Normaliza las ideas que manda el representante: [{ titulo, origen: "nuevo"|"volver", curso_id? }]
const validarIdeas = async (entrada, institucion_id) => {
  if (entrada === undefined || entrada === null) return { ideas: [] };
  if (!Array.isArray(entrada)) return { error: "Las ideas de cursos no tienen un formato válido" };
  if (entrada.length > MAX_IDEAS) return { error: `Podés cargar hasta ${MAX_IDEAS} ideas de cursos` };
  const ideas = [];
  const vistos = new Set();
  for (const i of entrada) {
    const origen = i?.origen === "volver" ? "volver" : "nuevo";
    let titulo = String(i?.titulo ?? "").trim();
    let curso_id = null;
    if (origen === "volver") {
      const curso = await cursosModel.findOne({ where: { id: i?.curso_id, institucion_id }, attributes: ["id", "titulo"] });
      if (!curso) return { error: "Uno de los cursos para traer de vuelta no pertenece a tu institución" };
      curso_id = curso.id;
      titulo = titulo || curso.titulo;
    }
    if (!titulo) continue;
    if (titulo.length > 150) return { error: "Cada idea de curso puede tener hasta 150 caracteres" };
    const clave = titulo.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    ideas.push({ titulo, origen, curso_id });
  }
  return { ideas };
};

const leerFechaCierre = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === "") return { fecha: null };
  const texto = String(valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || isNaN(new Date(texto))) return { error: "La fecha de cierre no es válida" };
  if (texto < hoyISO()) return { error: "La fecha de cierre no puede ser anterior a hoy" };
  return { fecha: texto };
};

// El representante crea una encuesta:
//  - "Satisfaccion" (de un curso): curso_id obligatorio (abierto o terminado). Sólo la ven sus alumnos.
//  - "Interes" (general): la ven todos los estudiantes. Puede llevar ideas de cursos para votar
//    y permitir que los estudiantes propongan las suyas. Las preguntas son opcionales.
// fecha_cierre opcional: si no viene, dura hasta que el representante la finalice.
export const crearEncuesta = async (req, res) => {
  const t = await sequelize.transaction();
  const cortar = async (estado, mensaje) => {
    await t.rollback();
    return res.status(estado).json({ mensaje });
  };
  try {
    const { titulo, descripcion, categoria_id, curso_id, tipo } = req.body;
    const tituloLimpio = String(titulo ?? "").trim();
    if (!tituloLimpio) return cortar(400, "El título de la encuesta es obligatorio");
    if (tituloLimpio.length > 150) return cortar(400, "El título no puede superar los 150 caracteres");

    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    if (!institucion_id) return cortar(400, "Tu usuario no está vinculado a ninguna institución");

    const tipoFinal = tipo === "Satisfaccion" ? "Satisfaccion" : "Interes";
    const cierre = leerFechaCierre(req.body.fecha_cierre);
    if (cierre.error) return cortar(400, cierre.error);

    let curso = null;
    if (tipoFinal === "Satisfaccion") {
      if (!curso_id) return cortar(400, "Elegí el curso al que va dirigida la encuesta");
      curso = await cursosModel.findOne({ where: { id: curso_id, institucion_id }, attributes: ["id", "titulo"] });
      if (!curso) return cortar(404, "Ese curso no pertenece a tu institución");
    }

    const ideasLeidas = tipoFinal === "Interes" ? await validarIdeas(req.body.ideas, institucion_id) : { ideas: [] };
    if (ideasLeidas.error) return cortar(400, ideasLeidas.error);
    const permitePropuestas = tipoFinal === "Interes" && (req.body.permite_propuestas === undefined || aBooleano(req.body.permite_propuestas));

    const hayPreguntas = Array.isArray(req.body.preguntas) && req.body.preguntas.length > 0;
    let limpias = [];
    if (hayPreguntas) {
      const validacion = validarPreguntas(req.body.preguntas);
      if (validacion.errores.length > 0) {
        await t.rollback();
        return res.status(400).json({ mensaje: validacion.errores[0], errores: validacion.errores });
      }
      limpias = validacion.limpias;
    } else if (tipoFinal === "Satisfaccion") {
      return cortar(400, "Agregá al menos una pregunta");
    } else if (ideasLeidas.ideas.length === 0 && !permitePropuestas) {
      return cortar(400, "Agregá preguntas, ideas de cursos para votar o permití que los estudiantes propongan ideas");
    }

    const encuesta = await encuestasModel.create(
      {
        titulo: tituloLimpio,
        descripcion: descripcion ? String(descripcion).trim().slice(0, 1000) : null,
        institucion_id,
        curso_id: curso ? curso.id : null,
        categoria_id: tipoFinal === "Interes" ? categoria_id || null : null,
        tipo: tipoFinal,
        fecha_cierre: cierre.fecha,
        permite_propuestas: permitePropuestas,
      },
      { transaction: t },
    );
    if (limpias.length) {
      await encuestasPreguntasModel.bulkCreate(limpias.map((p) => ({ ...p, encuesta_id: encuesta.id })), { transaction: t });
    }
    if (ideasLeidas.ideas.length) {
      await encuestasIdeasModel.bulkCreate(ideasLeidas.ideas.map((i) => ({ ...i, encuesta_id: encuesta.id })), { transaction: t });
    }
    await t.commit();

    // Aviso en la campanita: la de un curso sólo a sus alumnos; la general a todos los estudiantes
    const destinatarios =
      tipoFinal === "Satisfaccion"
        ? inscripcionesModel
            .findAll({ where: { curso_id: curso.id, estado: { [Op.in]: ESTADOS_ALUMNO } }, attributes: ["usuario_id"] })
            .then((ins) =>
              usuariosModel.findAll({ where: { id: [...new Set(ins.map((i) => i.usuario_id))], activo: true, acepta_notificaciones: true } }),
            )
        : usuariosModel.findAll({
            where: { activo: true, acepta_notificaciones: true },
            include: [{ association: "rol", where: { nombre: "ciudadano" } }],
          });
    destinatarios
      .then((usuarios) =>
        notificarAUsuarios({
          usuarios,
          titulo: `Nueva encuesta: ${encuesta.titulo}`,
          mensaje:
            tipoFinal === "Interes"
              ? `¿Qué curso querés que traigamos? Votá y dejá tu idea en "${encuesta.titulo}".`
              : `Contanos cómo te va en "${curso.titulo}" respondiendo la encuesta "${encuesta.titulo}".`,
          tipo: "encuesta_nueva",
          url: "dashboard.html#mis-encuestas",
        }),
      )
      .catch((e) => console.error("Error notificando encuesta:", e.message));

    const completa = await encuestasModel.findByPk(encuesta.id, {
      include: [
        { model: encuestasPreguntasModel, as: "preguntas" },
        { model: encuestasIdeasModel, as: "ideas" },
      ],
      order: [[{ model: encuestasPreguntasModel, as: "preguntas" }, "orden", "ASC"]],
    });
    return res.status(201).json({ mensaje: "Encuesta creada", encuesta: completa });
  } catch (error) {
    await t.rollback().catch(() => {});
    return res
      .status(500)
      .json({ mensaje: "Error al crear la encuesta", error: error.message });
  }
};

// Ideas de una o varias encuestas con su cantidad de votos (ordenadas: más votadas primero)
const ideasConVotos = async (encuestaIds, persona_id = null) => {
  if (!encuestaIds.length) return new Map();
  const ideas = await encuestasIdeasModel.findAll({
    where: { encuesta_id: encuestaIds },
    include: [{ model: cursosModel, as: "curso", attributes: ["id", "titulo"] }],
    order: [["id", "ASC"]],
  });
  const conteos = ideas.length
    ? await encuestasIdeasVotosModel.count({ where: { idea_id: ideas.map((i) => i.id) }, group: ["idea_id"] })
    : [];
  const votosPorIdea = new Map(conteos.map((c) => [c.idea_id, Number(c.count)]));
  const mios =
    persona_id && ideas.length
      ? new Set(
          (await encuestasIdeasVotosModel.findAll({ where: { persona_id, idea_id: ideas.map((i) => i.id) }, attributes: ["idea_id"] })).map(
            (v) => v.idea_id,
          ),
        )
      : new Set();

  const porEncuesta = new Map();
  for (const i of ideas) {
    const item = {
      id: i.id,
      titulo: i.titulo,
      origen: i.origen,
      curso: i.curso ? { id: i.curso.id, titulo: i.curso.titulo } : null,
      votos: votosPorIdea.get(i.id) || 0,
      yaVote: mios.has(i.id),
      esMia: !!persona_id && i.persona_id === persona_id,
    };
    if (!porEncuesta.has(i.encuesta_id)) porEncuesta.set(i.encuesta_id, []);
    porEncuesta.get(i.encuesta_id).push(item);
  }
  for (const lista of porEncuesta.values()) lista.sort((a, b) => b.votos - a.votos || a.id - b.id);
  return porEncuesta;
};

// Encuestas que el ESTUDIANTE puede responder ahora:
//  - generales vigentes de cualquier institución
//  - de un curso, sólo si es alumno de ese curso
// Sin sesión se muestran sólo las generales.
export const verEncuestasActivas = async (req, res) => {
  try {
    const esCiudadano = req.usuario?.rol === "ciudadano";
    const cursosDelAlumno = esCiudadano ? await idsCursosDelAlumno(req.usuario.id) : [];
    const alcance = cursosDelAlumno.length
      ? { [Op.or]: [{ tipo: "Interes" }, { tipo: "Satisfaccion", curso_id: { [Op.in]: cursosDelAlumno } }] }
      : { tipo: "Interes" };

    const encuestas = await encuestasModel.findAll({
      where: { [Op.and]: [condicionVigente(), alcance] },
      include: [
        { model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
        { model: encuestasPreguntasModel, as: "preguntas" },
      ],
      order: [
        ["fecha_creacion", "DESC"],
        [{ model: encuestasPreguntasModel, as: "preguntas" }, "orden", "ASC"],
      ],
    });

    // Si hay sesión, marcamos cuáles ya respondió para no mostrarle de nuevo las preguntas
    let idsRespondidas = new Set();
    if (req.usuario?.persona_id) {
      const respondidas = await encuestasRespuestasModel.findAll({
        where: { persona_id: req.usuario.persona_id },
        attributes: ["encuesta_id"],
      });
      idsRespondidas = new Set(respondidas.map((r) => r.encuesta_id));
    }
    const ideas = await ideasConVotos(
      encuestas.filter((e) => e.tipo === "Interes").map((e) => e.id),
      req.usuario?.persona_id || null,
    );

    const salida = encuestas.map((e) => {
      const lista = ideas.get(e.id) || [];
      return {
        ...e.toJSON(),
        ideas: lista,
        misVotos: lista.filter((i) => i.yaVote).length,
        maxVotos: MAX_VOTOS_POR_PERSONA,
        misPropuestas: lista.filter((i) => i.esMia).length,
        maxPropuestas: MAX_PROPUESTAS_POR_PERSONA,
        yaRespondida: idsRespondidas.has(e.id),
      };
    });
    return res.status(200).json({ mensaje: "Encuestas activas", encuestas: salida });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener encuestas", error: error.message });
  }
};

// ESTUDIANTE: apoya (o quita el apoyo a) una idea de curso. POST /encuestas/:id/ideas/:ideaId/voto
export const votarIdea = async (req, res) => {
  try {
    const encuesta = await encuestasModel.findByPk(req.params.id);
    if (!encuesta || encuesta.tipo !== "Interes" || !(await puedeParticipar(encuesta, req.usuario))) {
      return res.status(404).json({ mensaje: "La encuesta ya no está disponible" });
    }
    const idea = await encuestasIdeasModel.findOne({ where: { id: req.params.ideaId, encuesta_id: encuesta.id } });
    if (!idea) return res.status(404).json({ mensaje: "Idea no encontrada" });

    const persona_id = req.usuario.persona_id;
    const existente = await encuestasIdeasVotosModel.findOne({ where: { idea_id: idea.id, persona_id } });
    if (existente) {
      await existente.destroy();
      return res.status(200).json({ mensaje: "Quitaste tu voto", votado: false });
    }
    const misVotos = await encuestasIdeasVotosModel.count({ where: { encuesta_id: encuesta.id, persona_id } });
    if (misVotos >= MAX_VOTOS_POR_PERSONA) {
      return res.status(400).json({ mensaje: `Podés apoyar hasta ${MAX_VOTOS_POR_PERSONA} ideas. Quitá un voto para elegir otra.` });
    }
    await encuestasIdeasVotosModel.create({ idea_id: idea.id, encuesta_id: encuesta.id, persona_id });
    return res.status(201).json({ mensaje: "¡Voto registrado!", votado: true });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(200).json({ mensaje: "Ya votaste esta idea", votado: true });
    return res.status(500).json({ mensaje: "No se pudo registrar el voto", error: error.message });
  }
};

// ESTUDIANTE: propone una idea de curso (y la vota). POST /encuestas/:id/ideas { titulo }
export const proponerIdea = async (req, res) => {
  try {
    const encuesta = await encuestasModel.findByPk(req.params.id);
    if (!encuesta || encuesta.tipo !== "Interes" || !(await puedeParticipar(encuesta, req.usuario))) {
      return res.status(404).json({ mensaje: "La encuesta ya no está disponible" });
    }
    if (!encuesta.permite_propuestas) return res.status(400).json({ mensaje: "Esta encuesta no acepta propuestas" });

    const titulo = String(req.body.titulo ?? "").trim().replace(/\s+/g, " ");
    if (titulo.length < 3) return res.status(400).json({ mensaje: "Escribí el nombre del curso que te gustaría" });
    if (titulo.length > 150) return res.status(400).json({ mensaje: "La idea puede tener hasta 150 caracteres" });

    const persona_id = req.usuario.persona_id;
    const ideas = await encuestasIdeasModel.findAll({ where: { encuesta_id: encuesta.id }, attributes: ["id", "titulo", "persona_id"] });
    const igual = ideas.find((i) => i.titulo.toLowerCase() === titulo.toLowerCase());
    const misVotos = await encuestasIdeasVotosModel.count({ where: { encuesta_id: encuesta.id, persona_id } });

    // Si alguien ya la propuso, en vez de duplicarla se suma el voto
    if (igual) {
      const yaVoto = await encuestasIdeasVotosModel.findOne({ where: { idea_id: igual.id, persona_id } });
      if (yaVoto) return res.status(200).json({ mensaje: "Esa idea ya está en la lista y ya la apoyaste" });
      if (misVotos >= MAX_VOTOS_POR_PERSONA) {
        return res.status(400).json({ mensaje: `Esa idea ya está en la lista. Ya usaste tus ${MAX_VOTOS_POR_PERSONA} votos: quitá uno para apoyarla.` });
      }
      await encuestasIdeasVotosModel.create({ idea_id: igual.id, encuesta_id: encuesta.id, persona_id });
      return res.status(200).json({ mensaje: "Esa idea ya estaba en la lista: le sumamos tu voto" });
    }

    if (ideas.filter((i) => i.persona_id === persona_id).length >= MAX_PROPUESTAS_POR_PERSONA) {
      return res.status(400).json({ mensaje: `Podés proponer hasta ${MAX_PROPUESTAS_POR_PERSONA} ideas por encuesta` });
    }
    if (ideas.length >= 100) return res.status(400).json({ mensaje: "Esta encuesta ya recibió muchas ideas. Votá alguna de la lista." });

    const idea = await encuestasIdeasModel.create({ encuesta_id: encuesta.id, titulo, origen: "propuesta", persona_id });
    let mensaje = "¡Gracias! Tu idea quedó en la lista para que otros la voten";
    if (misVotos < MAX_VOTOS_POR_PERSONA) {
      await encuestasIdeasVotosModel.create({ idea_id: idea.id, encuesta_id: encuesta.id, persona_id });
      mensaje = "¡Gracias! Tu idea quedó en la lista con tu voto";
    }

    notificarRepresentantes(encuesta.institucion_id, {
      tipo: "encuesta_respuesta",
      titulo: `Nueva idea de curso: ${titulo}`,
      mensaje: `Un estudiante propuso "${titulo}" en la encuesta "${encuesta.titulo}".`,
      url: `estadisticas_encuesta.html?id=${encuesta.id}`,
      agrupar: true,
      mensajeAgrupado: (n) => `${n} ideas nuevas de cursos en "${encuesta.titulo}".`,
    }).catch((e) => console.error("Error notificando idea:", e.message));

    return res.status(201).json({ mensaje });
  } catch (error) {
    return res.status(500).json({ mensaje: "No se pudo guardar tu idea", error: error.message });
  }
};

// Finaliza solas las encuestas cuya fecha de cierre ya pasó (lo llama el cron todos los días)
export async function finalizarEncuestasVencidas() {
  const [cantidad] = await encuestasModel.update(
    { activo: false },
    { where: { activo: true, fecha_cierre: { [Op.lt]: hoyISO() } } },
  );
  if (cantidad) console.log(`🗳️ ${cantidad} encuesta(s) llegaron a su fecha de cierre y se finalizaron.`);
  return cantidad;
}

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

    // Cantidad de respuestas de cada encuesta, en una sola consulta
    const conteos = encuestas.length
      ? await encuestasRespuestasModel.count({
          where: { encuesta_id: encuestas.map((e) => e.id) },
          group: ["encuesta_id"],
        })
      : [];
    const porEncuesta = new Map(conteos.map((c) => [c.encuesta_id, c.count]));
    const ideas = await ideasConVotos(encuestas.filter((e) => e.tipo === "Interes").map((e) => e.id));

    const salida = encuestas.map((e) => {
      const lista = ideas.get(e.id) || [];
      return {
        ...e.toJSON(),
        vigente: estaVigente(e),
        total_respuestas: porEncuesta.get(e.id) || 0,
        total_ideas: lista.length,
        total_votos: lista.reduce((acc, i) => acc + i.votos, 0),
        idea_top: lista[0] && lista[0].votos > 0 ? { titulo: lista[0].titulo, votos: lista[0].votos } : null,
      };
    });
    return res.status(200).json({ mensaje: "Tus encuestas", encuestas: salida });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tus encuestas", error: error.message });
  }
};

// El ciudadano responde una encuesta (una sola vez).
// Body: { respuestas: [{ pregunta_id, valor_opcion | valor_rating | valor_texto, justificacion? }] }
// (Compatibilidad: { respuesta: "texto" } sigue valiendo para encuestas de una sola pregunta de texto.)
export const responderEncuesta = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const encuesta = await encuestasModel.findByPk(req.params.id, {
      include: [{ model: encuestasPreguntasModel, as: "preguntas" }],
      order: [[{ model: encuestasPreguntasModel, as: "preguntas" }, "orden", "ASC"]],
      transaction: t,
    });
    if (!encuesta || !(await puedeParticipar(encuesta, req.usuario))) {
      await t.rollback();
      return res.status(404).json({ mensaje: "Esta encuesta ya finalizó o no está disponible para vos" });
    }
    if (encuesta.preguntas.length === 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: "Esta encuesta no tiene preguntas: votá las ideas de cursos" });
    }

    const yaRespondio = await encuestasRespuestasModel.findOne({
      where: { encuesta_id: encuesta.id, persona_id: req.usuario.persona_id },
      transaction: t,
    });
    if (yaRespondio) {
      await t.rollback();
      return res.status(409).json({ mensaje: "Ya respondiste esta encuesta" });
    }

    // --- Normalizamos la entrada (formato nuevo o formato viejo de una sola respuesta) ---
    let entradas = req.body.respuestas;
    let textoLegacy = null;
    if (!Array.isArray(entradas)) {
      textoLegacy = String(req.body.respuesta ?? "").trim();
      const unica = encuesta.preguntas.length === 1 ? encuesta.preguntas[0] : null;
      if (!textoLegacy || !unica || unica.tipo !== "texto_abierto") {
        await t.rollback();
        return res.status(400).json({ mensaje: "Respondé las preguntas de la encuesta" });
      }
      entradas = [{ pregunta_id: unica.id, valor_texto: textoLegacy }];
    }

    const porPregunta = new Map();
    for (const e of entradas) porPregunta.set(Number(e?.pregunta_id), e);
    const idsValidos = new Set(encuesta.preguntas.map((p) => p.id));
    for (const id of porPregunta.keys()) {
      if (!idsValidos.has(id)) {
        await t.rollback();
        return res.status(400).json({ mensaje: "Hay respuestas a preguntas que no pertenecen a esta encuesta" });
      }
    }

    // --- Validamos pregunta por pregunta según su tipo ---
    const errores = [];
    const detalles = [];

    for (const p of encuesta.preguntas) {
      const e = porPregunta.get(p.id) || {};
      const detalle = {
        pregunta_id: p.id,
        valor_opcion: null,
        valor_rating: null,
        valor_texto: null,
        justificacion: null,
      };
      let respondida = false;

      if (p.tipo === "opcion_multiple") {
        const v = String(e.valor_opcion ?? "").trim();
        if (v) {
          if (!p.opciones.includes(v)) errores.push(`Opción inválida en "${p.texto}"`);
          else {
            detalle.valor_opcion = v;
            respondida = true;
          }
        }
      } else if (p.tipo === "rating") {
        const crudo = e.valor_rating;
        if (crudo !== undefined && crudo !== null && crudo !== "") {
          const n = Number(crudo);
          if (!Number.isInteger(n) || n < 1 || n > p.escala_max) {
            errores.push(`La valoración de "${p.texto}" debe ir de 1 a ${p.escala_max}`);
          } else {
            detalle.valor_rating = n;
            respondida = true;
          }
        }
      } else {
        const v = String(e.valor_texto ?? "").trim();
        if (v) {
          if (v.length > 2000) errores.push(`La respuesta de "${p.texto}" supera los 2000 caracteres`);
          else {
            detalle.valor_texto = v;
            respondida = true;
          }
        }
      }

      if (respondida && p.permite_justificacion && p.tipo !== "texto_abierto") {
        const j = String(e.justificacion ?? "").trim();
        if (j.length > 1000) errores.push(`La justificación de "${p.texto}" supera los 1000 caracteres`);
        else if (j) detalle.justificacion = j;
      }

      if (!respondida) {
        if (p.obligatoria) errores.push(`Falta responder: "${p.texto}"`);
        continue;
      }
      detalles.push(detalle);
    }

    if (errores.length > 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: errores[0], errores });
    }
    if (detalles.length === 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: "Respondé al menos una pregunta" });
    }

    const participacion = await encuestasRespuestasModel.create(
      {
        encuesta_id: encuesta.id,
        persona_id: req.usuario.persona_id,
        respuesta: textoLegacy ? textoLegacy.slice(0, 255) : null,
      },
      { transaction: t },
    );
    await encuestasRespuestasDetalleModel.bulkCreate(
      detalles.map((d) => ({ ...d, respuesta_id: participacion.id })),
      { transaction: t },
    );
    await t.commit();

    // Campanita del representante: "nueva respuesta" (agrupada si hay varias sin leer)
    notificarRepresentantes(encuesta.institucion_id, {
      tipo: "encuesta_respuesta",
      titulo: `Nueva respuesta: ${encuesta.titulo}`,
      mensaje: `Alguien respondió tu encuesta "${encuesta.titulo}".`,
      url: `estadisticas_encuesta.html?id=${encuesta.id}`,
      agrupar: true,
      mensajeAgrupado: (n) => `${n} respuestas nuevas en "${encuesta.titulo}".`,
    }).catch((e) => console.error("Error notificando respuesta de encuesta:", e.message));

    return res.status(201).json({ mensaje: "¡Gracias por responder!" });
  } catch (error) {
    await t.rollback().catch(() => {});
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ mensaje: "Ya respondiste esta encuesta" });
    }
    return res
      .status(500)
      .json({ mensaje: "Error al registrar tu respuesta", error: error.message });
  }
};

// ============================================================
// ESTADÍSTICAS: agrega las respuestas pregunta por pregunta
// ============================================================
const redondear = (n, decimales = 2) => Math.round(n * 10 ** decimales) / 10 ** decimales;

export function armarResultados(preguntas, detalles, fechaPorParticipacion) {
  const detallesPorPregunta = new Map();
  for (const d of detalles) {
    if (!detallesPorPregunta.has(d.pregunta_id)) detallesPorPregunta.set(d.pregunta_id, []);
    detallesPorPregunta.get(d.pregunta_id).push(d);
  }
  const masNuevoPrimero = (a, b) => new Date(b.fecha) - new Date(a.fecha);

  return preguntas.map((p) => {
    const lista = detallesPorPregunta.get(p.id) || [];
    const base = {
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      obligatoria: p.obligatoria,
      permite_justificacion: p.permite_justificacion,
      total_respuestas: lista.length,
    };
    const justificaciones = lista
      .filter((d) => d.justificacion)
      .map((d) => ({
        valor: d.valor_opcion ?? (d.valor_rating != null ? String(d.valor_rating) : null),
        texto: d.justificacion,
        fecha: fechaPorParticipacion.get(d.respuesta_id),
      }))
      .sort(masNuevoPrimero);

    if (p.tipo === "opcion_multiple") {
      const conteo = new Map(p.opciones.map((o) => [o, 0]));
      lista.forEach((d) => conteo.set(d.valor_opcion, (conteo.get(d.valor_opcion) || 0) + 1));
      return {
        ...base,
        opciones: [...conteo.entries()].map(([opcion, cantidad]) => ({
          opcion,
          cantidad,
          porcentaje: lista.length ? redondear((cantidad / lista.length) * 100, 1) : 0,
        })),
        justificaciones,
      };
    }

    if (p.tipo === "rating") {
      const distribucion = Array.from({ length: p.escala_max }, (_, i) => ({ valor: i + 1, cantidad: 0 }));
      let suma = 0;
      lista.forEach((d) => {
        distribucion[d.valor_rating - 1].cantidad += 1;
        suma += d.valor_rating;
      });
      return {
        ...base,
        escala_max: p.escala_max,
        promedio: lista.length ? redondear(suma / lista.length) : null,
        distribucion,
        justificaciones,
      };
    }

    return {
      ...base,
      respuestas_texto: lista
        .map((d) => ({ texto: d.valor_texto, fecha: fechaPorParticipacion.get(d.respuesta_id) }))
        .sort(masNuevoPrimero),
    };
  });
}

// Resultados de una encuesta (sólo el representante dueño).
// Las respuestas son anónimas: nunca se devuelve quién respondió.
export const verResultadosEncuesta = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const encuesta = await encuestasModel.findOne({
      where: { id: req.params.id, institucion_id },
      include: [
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        { model: encuestasPreguntasModel, as: "preguntas" },
      ],
      order: [[{ model: encuestasPreguntasModel, as: "preguntas" }, "orden", "ASC"]],
    });
    if (!encuesta)
      return res.status(404).json({ mensaje: "Encuesta no encontrada en tu institución" });

    const participaciones = await encuestasRespuestasModel.findAll({
      where: { encuesta_id: encuesta.id },
      attributes: ["id", "respuesta", "fecha"],
      order: [["fecha", "DESC"]],
    });
    const fechaPorParticipacion = new Map(participaciones.map((r) => [r.id, r.fecha]));

    const detalles = participaciones.length
      ? await encuestasRespuestasDetalleModel.findAll({
          where: { respuesta_id: participaciones.map((r) => r.id) },
        })
      : [];

    return res.status(200).json({
      mensaje: "Resultados de la encuesta",
      encuesta: {
        id: encuesta.id,
        titulo: encuesta.titulo,
        descripcion: encuesta.descripcion,
        tipo: encuesta.tipo,
        activo: encuesta.activo,
        vigente: estaVigente(encuesta),
        fecha_cierre: encuesta.fecha_cierre,
        permite_propuestas: encuesta.permite_propuestas,
        curso: encuesta.curso,
        categoria: encuesta.categoria,
        fecha_creacion: encuesta.fecha_creacion,
      },
      totalRespuestas: participaciones.length,
      // Ranking de ideas de cursos (encuestas generales): más votadas primero
      ideas: (await ideasConVotos([encuesta.id])).get(encuesta.id) || [],
      totalVotantes: await encuestasIdeasVotosModel.count({ where: { encuesta_id: encuesta.id }, distinct: true, col: "persona_id" }),
      preguntas: armarResultados(encuesta.preguntas, detalles, fechaPorParticipacion),
      // Compatibilidad con el formato viejo (sin datos personales)
      respuestas: participaciones.map((r) => ({ id: r.id, respuesta: r.respuesta, fecha: r.fecha })),
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
    return res.status(200).json({ mensaje: "Encuesta finalizada: los estudiantes ya no la ven" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al cerrar la encuesta", error: error.message });
  }
};
