import { sequelize } from "../config/database.js";
import {
  encuestasModel,
  encuestasPreguntasModel,
  encuestasRespuestasModel,
  encuestasRespuestasDetalleModel,
  categoriasModel,
  cursosModel,
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

// El representante crea una encuesta. Puede ser:
//  - tipo "Interes": para preguntar, antes de lanzar cursos, qué categoría de
//    capacitación le interesaría a la gente (categoria_id opcional).
//  - tipo "Satisfaccion": ligada a un curso puntual ya finalizado, para medir
//    si convendría relanzar esa capacitación (curso_id obligatorio).
// Ahora la encuesta trae un arreglo `preguntas` (selección múltiple / texto abierto / rating).
// Si no se manda ninguna, se arma una sola pregunta de texto libre con el título
// (así el formulario viejo sigue funcionando).
export const crearEncuesta = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { titulo, descripcion, categoria_id, curso_id, tipo } = req.body;
    const tituloLimpio = String(titulo ?? "").trim();
    if (!tituloLimpio) {
      await t.rollback();
      return res.status(400).json({ mensaje: "El título/pregunta es obligatorio" });
    }
    if (tituloLimpio.length > 150) {
      await t.rollback();
      return res.status(400).json({ mensaje: "El título no puede superar los 150 caracteres" });
    }

    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    if (!institucion_id) {
      await t.rollback();
      return res
        .status(400)
        .json({ mensaje: "Tu usuario no está vinculado a ninguna institución" });
    }

    const tipoFinal = tipo === "Satisfaccion" ? "Satisfaccion" : "Interes";

    if (tipoFinal === "Satisfaccion") {
      if (!curso_id) {
        await t.rollback();
        return res
          .status(400)
          .json({ mensaje: "Una encuesta de satisfacción necesita un curso_id" });
      }
      const curso = await cursosModel.findOne({ where: { id: curso_id, institucion_id } });
      if (!curso) {
        await t.rollback();
        return res.status(404).json({ mensaje: "Ese curso no pertenece a tu institución" });
      }
    }

    const hayPreguntas = Array.isArray(req.body.preguntas) && req.body.preguntas.length > 0;
    const { errores, limpias } = validarPreguntas(
      hayPreguntas ? req.body.preguntas : [{ texto: tituloLimpio, tipo: "texto_abierto" }],
    );
    if (errores.length > 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: errores[0], errores });
    }

    const encuesta = await encuestasModel.create(
      {
        titulo: tituloLimpio,
        descripcion: descripcion ? String(descripcion).trim().slice(0, 1000) : null,
        institucion_id,
        curso_id: tipoFinal === "Satisfaccion" ? curso_id : null,
        categoria_id: categoria_id || null,
        tipo: tipoFinal,
      },
      { transaction: t },
    );
    await encuestasPreguntasModel.bulkCreate(
      limpias.map((p) => ({ ...p, encuesta_id: encuesta.id })),
      { transaction: t },
    );
    await t.commit();

    // Avisamos a los ciudadanos que la encuesta está disponible (mismo canal
    // de notificaciones que se usa para los cursos nuevos).
    usuariosModel
      .findAll({
        where: { activo: true, acepta_notificaciones: true },
        include: [{ association: "rol", where: { nombre: "ciudadano" } }],
      })
      .then((ciudadanos) =>
        notificarAUsuarios({
          usuarios: ciudadanos,
          titulo: `Nueva encuesta: ${encuesta.titulo}`,
          mensaje:
            tipoFinal === "Interes"
              ? `Queremos saber qué capacitaciones te interesan. Respondé la encuesta "${encuesta.titulo}" desde la plataforma.`
              : `Contanos qué te pareció el curso respondiendo la encuesta "${encuesta.titulo}".`,
          tipo: "encuesta_nueva",
          url: "dashboard.html",
        }),
      )
      .catch((e) => console.error("Error notificando encuesta:", e.message));

    const completa = await encuestasModel.findByPk(encuesta.id, {
      include: [{ model: encuestasPreguntasModel, as: "preguntas" }],
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

// Encuestas activas, pensadas para que el ciudadano las responda (login opcional
// para verlas, pero se necesita estar logueado para responder).
export const verEncuestasActivas = async (req, res) => {
  try {
    const encuestas = await encuestasModel.findAll({
      where: { activo: true },
      include: [
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
        { model: encuestasPreguntasModel, as: "preguntas" },
      ],
      order: [
        ["fecha_creacion", "DESC"],
        [{ model: encuestasPreguntasModel, as: "preguntas" }, "orden", "ASC"],
      ],
    });

    // Si hay sesión, marcamos cuáles ya respondió para no mostrárselas de nuevo
    let idsRespondidas = new Set();
    if (req.usuario) {
      const respondidas = await encuestasRespuestasModel.findAll({
        where: { persona_id: req.usuario.persona_id },
        attributes: ["encuesta_id"],
      });
      idsRespondidas = new Set(respondidas.map((r) => r.encuesta_id));
    }

    const salida = encuestas.map((e) => ({
      ...e.toJSON(),
      yaRespondida: idsRespondidas.has(e.id),
    }));
    return res.status(200).json({ mensaje: "Encuestas activas", encuestas: salida });
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

    // Cantidad de respuestas de cada encuesta, en una sola consulta
    const conteos = encuestas.length
      ? await encuestasRespuestasModel.count({
          where: { encuesta_id: encuestas.map((e) => e.id) },
          group: ["encuesta_id"],
        })
      : [];
    const porEncuesta = new Map(conteos.map((c) => [c.encuesta_id, c.count]));

    const salida = encuestas.map((e) => ({
      ...e.toJSON(),
      total_respuestas: porEncuesta.get(e.id) || 0,
    }));
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
    if (!encuesta || !encuesta.activo) {
      await t.rollback();
      return res.status(404).json({ mensaje: "Encuesta no encontrada o inactiva" });
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
        curso: encuesta.curso,
        categoria: encuesta.categoria,
        fecha_creacion: encuesta.fecha_creacion,
      },
      totalRespuestas: participaciones.length,
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
    return res.status(200).json({ mensaje: "Encuesta cerrada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al cerrar la encuesta", error: error.message });
  }
};
