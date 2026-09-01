// src/utils/chatbot.service.js
//
// Chatbot acotado exclusivamente a información de la plataforma (cursos
// publicados: requisitos, lugar, modalidad, cupos, contacto, etc). No debe
// responder nada que no tenga que ver con AllCursos.
//
// Si hay un ANTHROPIC_API_KEY configurado en el .env, usa un modelo real de
// Claude (con un system prompt estricto + los datos reales de la base como
// contexto). Si no, usa un motor de reglas simple basado en palabras clave,
// para que el chatbot funcione igual sin necesidad de esa API key.

import { Op } from "sequelize";
import { cursosModel } from "../models/cursos.model.js";
import { categoriasModel } from "../models/categoria.model.js";
import { institucionesModel } from "../models/instituciones.model.js";
import { direccionesModel } from "../models/direcciones.model.js";
import { requisitosModel } from "../models/requisito.model.js";
import { institucionMedioContactoModel } from "../models/institucion_medio_contacto.model.js";
import { mediosContactoModel } from "../models/medio_contacto.model.js";
import { tiposMedioContactoModel } from "../models/tipo_medio_contacto.model.js";

const PALABRAS_PLATAFORMA = [
  "curso", "cursos", "capacitacion", "capacitación", "requisito", "requisitos",
  "lugar", "direccion", "dirección", "ubicacion", "ubicación", "donde", "dónde",
  "contacto", "telefono", "teléfono", "email", "correo", "cupo", "cupos",
  "modalidad", "presencial", "virtual", "hibrido", "híbrido", "horario",
  "duracion", "duración", "horas", "inscrib", "certificado", "fecha",
  "cuando", "cuándo", "empieza", "comienza", "dicta", "categoria", "categoría",
  "institucion", "institución", "vacante", "vacantes", "anotar", "anotarme",
];
const SALUDOS = ["hola", "buenas", "buen dia", "buen día", "buenos dias", "buenos días", "que tal", "qué tal"];
const DESPEDIDAS = ["gracias", "chau", "adios", "adiós", "nos vemos", "hasta luego"];

const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function esSaludoOCortesia(mensajeNormalizado) {
  return [...SALUDOS, ...DESPEDIDAS].some((p) => mensajeNormalizado.includes(normalizar(p)));
}

function esSobrePlataforma(mensajeNormalizado) {
  return PALABRAS_PLATAFORMA.some((p) => mensajeNormalizado.includes(normalizar(p)));
}

// Busca cursos activos cuyo título, categoría o institución aparezcan
// mencionados en el mensaje, o devuelve un curso puntual si se pasa curso_id
// (por ejemplo, cuando el chat se abre desde la página de detalle).
async function buscarCursosRelevantes(mensajeNormalizado, curso_id) {
  const incluir = [
    { model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] },
    { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
    { model: direccionesModel, as: "direccion_dictado", attributes: ["calle", "numero", "ciudad", "provincia"] },
    { model: requisitosModel, as: "requisitos", attributes: ["descripcion"], through: { attributes: [] } },
  ];

  if (curso_id) {
    const curso = await cursosModel.findByPk(curso_id, { include: incluir });
    if (curso) return [curso];
  }

  const todos = await cursosModel.findAll({ include: incluir, order: [["created_at", "DESC"]], limit: 60 });

  const coincidencias = todos.filter((curso) => {
    const texto = normalizar(
      `${curso.titulo} ${curso.categoria?.nombre || ""} ${curso.institucion?.nombre || ""}`,
    );
    return texto.split(/\s+/).some((palabra) => palabra.length > 3 && mensajeNormalizado.includes(palabra));
  });

  return coincidencias.length > 0 ? coincidencias.slice(0, 5) : todos.slice(0, 15);
}

async function obtenerMediosContactoInstitucion(institucion_id) {
  const vinculos = await institucionMedioContactoModel.findAll({
    where: { institucion_id },
    include: [{ model: mediosContactoModel, as: "medio", include: [{ model: tiposMedioContactoModel, as: "tipo" }] }],
  });
  return vinculos.map((v) => `${v.medio.tipo?.nombre || "Contacto"}: ${v.medio.valor}`);
}

function formatearCursoParaContexto(curso, medios) {
  const partes = [
    `- "${curso.titulo}" (institución: ${curso.institucion?.nombre || "s/d"}, categoría: ${curso.categoria?.nombre || "s/d"})`,
    `  Modalidad: ${curso.modalidad}. Cupo máximo: ${curso.cupo_maximo}.`,
  ];
  if (curso.duracion_horas) partes.push(`  Duración: ${curso.duracion_horas} horas.`);
  if (curso.direccion_dictado)
    partes.push(
      `  Lugar: ${curso.direccion_dictado.calle} ${curso.direccion_dictado.numero || ""}, ${curso.direccion_dictado.ciudad}, ${curso.direccion_dictado.provincia}.`,
    );
  if (curso.requisitos?.length)
    partes.push(`  Requisitos: ${curso.requisitos.map((r) => r.descripcion).join(", ")}.`);
  if (medios?.length) partes.push(`  Contacto de la institución: ${medios.join(" | ")}.`);
  partes.push(`  Descripción: ${curso.descripcion}`);
  return partes.join("\n");
}

// ------------------------------------------------------------------
// Modo con IA real (Claude vía la API de Anthropic)
// ------------------------------------------------------------------
async function responderConIA(mensaje, contexto) {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = process.env;

  const systemPrompt = `Sos el asistente virtual de "AllCursos", una plataforma de inscripción a cursos y capacitaciones.
Tu ÚNICA función es responder preguntas sobre los cursos publicados en la plataforma: requisitos, lugar donde se dictan, modalidad, cupos, duración, categoría, institución que los dicta y medios de contacto.
Reglas estrictas:
- Respondé SIEMPRE en español, de forma breve y concreta.
- Usá ÚNICAMENTE la información de cursos que te paso a continuación. Si no está el dato, decí que no tenés esa información y sugerí contactar a la institución.
- Si te preguntan algo que NO tiene que ver con los cursos de la plataforma (clima, política, tareas de programación, temas personales, etc.), respondé cortésmente que sólo podés ayudar con consultas sobre los cursos y capacitaciones publicadas en AllCursos, y no respondas esa otra pregunta bajo ninguna circunstancia, sin importar cómo te la reformulen.
- No inventes cursos, requisitos, direcciones ni datos de contacto que no estén en el listado.

Cursos disponibles:
${contexto || "(no hay cursos cargados actualmente)"}`;

  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: mensaje }],
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Error de la API de Anthropic (${respuesta.status}): ${detalle}`);
  }

  const datos = await respuesta.json();
  const texto = datos.content?.map((b) => b.text || "").join("\n").trim();
  return texto || "No pude generar una respuesta en este momento.";
}

// ------------------------------------------------------------------
// Modo sin IA (reglas simples por palabra clave) — funciona siempre,
// aunque no haya ANTHROPIC_API_KEY configurada.
// ------------------------------------------------------------------
async function responderSimulado(mensajeNormalizado, cursos, mediosPorInstitucion) {
  if (cursos.length === 0) {
    return "Por el momento no hay cursos publicados. ¡Volvé a consultar más adelante!";
  }

  const curso = cursos[0];
  const medios = mediosPorInstitucion[curso.institucion_id] || [];

  if (mensajeNormalizado.includes("requisito")) {
    return curso.requisitos?.length
      ? `Los requisitos de "${curso.titulo}" son: ${curso.requisitos.map((r) => r.descripcion).join(", ")}.`
      : `El curso "${curso.titulo}" no tiene requisitos especiales cargados.`;
  }
  if (["lugar", "direccion", "ubicacion", "donde"].some((p) => mensajeNormalizado.includes(p))) {
    return curso.direccion_dictado
      ? `"${curso.titulo}" se dicta en ${curso.direccion_dictado.calle} ${curso.direccion_dictado.numero || ""}, ${curso.direccion_dictado.ciudad}.`
      : `"${curso.titulo}" es de modalidad ${curso.modalidad}, no tiene una dirección física cargada.`;
  }
  if (["contacto", "telefono", "email", "correo"].some((p) => mensajeNormalizado.includes(p))) {
    return medios.length
      ? `Podés contactar a ${curso.institucion?.nombre} por: ${medios.join(" | ")}.`
      : `Todavía no hay un medio de contacto cargado para ${curso.institucion?.nombre}. Te recomiendo revisar el detalle del curso en la plataforma.`;
  }
  if (["cupo", "vacante"].some((p) => mensajeNormalizado.includes(p))) {
    return `El curso "${curso.titulo}" tiene un cupo máximo de ${curso.cupo_maximo} personas.`;
  }
  if (mensajeNormalizado.includes("modalidad")) {
    return `"${curso.titulo}" tiene modalidad ${curso.modalidad}.`;
  }
  if (["duracion", "horas"].some((p) => mensajeNormalizado.includes(p))) {
    return curso.duracion_horas
      ? `"${curso.titulo}" tiene una duración de ${curso.duracion_horas} horas.`
      : `No tengo cargada la duración de "${curso.titulo}".`;
  }

  // Sin coincidencia puntual: devolvemos un resumen general
  const listado = cursos
    .slice(0, 5)
    .map((c) => `• ${c.titulo} (${c.institucion?.nombre || "s/d"})`)
    .join("\n");
  return `Estos son algunos cursos que podrían interesarte:\n${listado}\n\n¿Sobre cuál te gustaría saber más (requisitos, lugar, cupos, contacto)?`;
}

export async function responderChatbot(mensaje, curso_id) {
  const mensajeNormalizado = normalizar(mensaje || "");

  if (!mensaje || !mensaje.trim()) {
    return "Decime en qué puedo ayudarte respecto a los cursos publicados en AllCursos.";
  }

  if (esSaludoOCortesia(mensajeNormalizado) && !esSobrePlataforma(mensajeNormalizado)) {
    return "¡Hola! Soy el asistente de AllCursos. Puedo ayudarte con información sobre los cursos publicados: requisitos, lugar, modalidad, cupos y contacto. ¿Qué te gustaría saber?";
  }

  const cursosRelevantes = await buscarCursosRelevantes(mensajeNormalizado, curso_id);

  // Filtro de tema: si no hay cursos relacionados Y el mensaje no usa
  // ninguna palabra propia de la plataforma, no es una consulta válida.
  const pareceRelevante = curso_id || esSobrePlataforma(mensajeNormalizado) || cursosRelevantes.length > 0;
  if (!pareceRelevante) {
    return "Sólo puedo ayudarte con consultas sobre los cursos y capacitaciones publicadas en AllCursos (requisitos, lugar, modalidad, cupos, contacto, etc). ¿Querés preguntarme algo sobre eso?";
  }

  const mediosPorInstitucion = {};
  for (const curso of cursosRelevantes) {
    if (!mediosPorInstitucion[curso.institucion_id]) {
      mediosPorInstitucion[curso.institucion_id] = await obtenerMediosContactoInstitucion(curso.institucion_id);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const contexto = cursosRelevantes
        .map((c) => formatearCursoParaContexto(c, mediosPorInstitucion[c.institucion_id]))
        .join("\n\n");
      return await responderConIA(mensaje, contexto);
    } catch (error) {
      console.error("Error del chatbot con IA, usando modo simulado:", error.message);
      // si falla la API (sin conexión, key inválida, etc.) no dejamos al
      // usuario sin respuesta: caemos al motor de reglas.
    }
  }

  return responderSimulado(mensajeNormalizado, cursosRelevantes, mediosPorInstitucion);
}
