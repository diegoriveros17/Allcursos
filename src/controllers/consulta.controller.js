import { Op } from "sequelize";
import {
  consultasCursoModel,
  cursosModel,
  institucionesModel,
  mensajesConsultaModel,
  personasModel,
  representanteInstituModel,
  usuariosModel,
} from "../models/index.js";
import { crearNotificacionUsuario, notificarRepresentantes } from "../utils/notificaciones.service.js";
import { construirUrl } from "../config/appUrl.js";
import { escaparHtml } from "../utils/html.js";

const MIN_CONSULTA = 10;
const MIN_MENSAJE = 2;
const MAX_MENSAJE = 2000;

const obtenerInstitucionDeRepresentante = async (usuarioReq) => {
  if (usuarioReq.institucion_id) return usuarioReq.institucion_id;
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: usuarioReq.id },
  });
  return representacion ? representacion.institucion_id : null;
};

// Usuario con sus datos personales (nombre, apellido) para armar la consulta/mensaje
const obtenerUsuarioConPersona = (id) =>
  usuariosModel.findByPk(id, {
    attributes: ["id", "email_login"],
    include: [{ model: personasModel, as: "persona", attributes: ["nombre", "apellido"] }],
  });

const nombreCompleto = (usuario) =>
  [usuario?.persona?.nombre, usuario?.persona?.apellido].filter(Boolean).join(" ") || "Usuario";

// Consultas del ciudadano: las que hizo con su cuenta + las viejas que dejó como
// visitante con el mismo email (antes de que fuera obligatorio iniciar sesión)
const condicionConsultasDelCiudadano = (usuario) => ({
  [Op.or]: [{ usuario_id: usuario.id }, { usuario_id: null, email: usuario.email_login }],
});

// Lo que se incluye al devolver una consulta con su conversación
const incluirConversacion = [
  { model: cursosModel, as: "curso", attributes: ["id", "titulo", "imagen_url"] },
  { model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] },
  {
    model: mensajesConsultaModel,
    as: "mensajes",
    attributes: ["id", "autor", "mensaje", "fecha_creacion"],
    include: [
      {
        model: usuariosModel,
        as: "autor_usuario",
        attributes: ["id"],
        include: [{ model: personasModel, as: "persona", attributes: ["nombre", "apellido"] }],
      },
    ],
  },
];
// Se ordena por id (siempre crece) porque dos mensajes en el mismo segundo empatan en la fecha
const ordenConversacion = [
  ["fecha_creacion", "DESC"],
  ["id", "DESC"],
  [{ model: mensajesConsultaModel, as: "mensajes" }, "id", "ASC"],
];

const validarTexto = (texto, minimo) => {
  if (texto.length < minimo) return `Escribí un mensaje (mínimo ${minimo} caracteres)`;
  if (texto.length > MAX_MENSAJE) return `El mensaje no puede superar los ${MAX_MENSAJE} caracteres`;
  return null;
};

// ============================================================
// CIUDADANO: hace una consulta sobre un curso (requiere sesión).
// POST /api/cursos/:id/consultas  { mensaje }
//  1) se guarda en la BD con el usuario que la hizo
//  2) se avisa en la campanita (y por email) a los representantes de la institución,
//     que la responden desde su panel: la respuesta queda en la plataforma
// ============================================================
export const crearConsulta = async (req, res) => {
  try {
    const mensaje = String(req.body.mensaje ?? "").trim();
    const error = validarTexto(mensaje, MIN_CONSULTA);
    if (error) return res.status(400).json({ mensaje: error.replace("un mensaje", "tu consulta") });

    const usuario = await obtenerUsuarioConPersona(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const curso = await cursosModel.findByPk(req.params.id, {
      include: [{ model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] }],
    });
    if (!curso) return res.status(404).json({ mensaje: "Curso no encontrado" });

    const nombre = nombreCompleto(usuario).slice(0, 100);
    const consulta = await consultasCursoModel.create({
      curso_id: curso.id,
      institucion_id: curso.institucion_id,
      usuario_id: usuario.id,
      nombre,
      email: usuario.email_login,
      mensaje,
    });

    // Aviso en campanita + email a los representantes. Se hace sin bloquear la
    // respuesta: si el SMTP tarda o falla, la consulta ya quedó guardada igual.
    notificarRepresentantes(curso.institucion_id, {
      tipo: "consulta",
      titulo: `Nueva consulta sobre "${curso.titulo}"`,
      mensaje: `${nombre}: ${mensaje}`,
      url: "dashboard.html#consultas",
      email: {
        subject: `Nueva consulta sobre "${curso.titulo}" - AllCursos`,
        html: `
          <h2>Nueva consulta sobre tu curso</h2>
          <p><strong>Curso:</strong> ${escaparHtml(curso.titulo)}</p>
          <p><strong>De:</strong> ${escaparHtml(nombre)}</p>
          <blockquote style="border-left:4px solid #2f7d6b;margin:12px 0;padding:8px 12px;background:#f5f7fa;white-space:pre-wrap;">${escaparHtml(mensaje)}</blockquote>
          <p>Las consultas se responden desde tu panel de AllCursos (no respondas este correo):</p>
          <p><a href="${construirUrl("dashboard.html#consultas")}" style="background:#1e3a5f;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Responder desde mi panel</a></p>
        `,
      },
    }).catch((e) => console.error("Error notificando consulta:", e.message));

    return res.status(201).json({
      mensaje: "¡Consulta enviada! Te avisamos en la campanita cuando la institución responda. La podés seguir en Mi Panel › Mis consultas.",
      id: consulta.id,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "No se pudo enviar la consulta", error: error.message });
  }
};

// ============================================================
// CIUDADANO: sus consultas con la conversación completa
// GET /api/consultas/enviadas
// ============================================================
export const verConsultasEnviadas = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioConPersona(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const consultas = await consultasCursoModel.findAll({
      where: { ...condicionConsultasDelCiudadano(usuario), oculta_ciudadano: false },
      include: incluirConversacion,
      order: ordenConversacion,
      limit: 100,
    });
    const novedades = consultas.filter((c) => c.novedad_ciudadano).length;
    return res.status(200).json({ mensaje: "Tus consultas", novedades, consultas });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener tus consultas", error: error.message });
  }
};

// CIUDADANO: marca que ya vio la respuesta (apaga el indicador de "respuesta nueva")
// PUT /api/consultas/:id/vista
export const marcarConsultaVista = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioConPersona(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    await consultasCursoModel.update(
      { novedad_ciudadano: false },
      { where: { id: req.params.id, ...condicionConsultasDelCiudadano(usuario) } },
    );
    return res.status(200).json({ mensaje: "Consulta marcada como vista" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al actualizar la consulta", error: error.message });
  }
};

// ============================================================
// CIUDADANO o REPRESENTANTE: agrega un mensaje a la conversación
// POST /api/consultas/:id/mensajes  { mensaje }
// - Representante: responde -> la consulta queda "respondida" y se avisa al ciudadano
// - Ciudadano: repregunta  -> la consulta vuelve a "nueva" y se avisa a la institución
// ============================================================
export const enviarMensajeConsulta = async (req, res) => {
  try {
    const texto = String(req.body.mensaje ?? "").trim();
    const error = validarTexto(texto, MIN_MENSAJE);
    if (error) return res.status(400).json({ mensaje: error });

    const consulta = await consultasCursoModel.findByPk(req.params.id, {
      include: [
        { model: cursosModel, as: "curso", attributes: ["id", "titulo"] },
        { model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] },
      ],
    });
    if (!consulta) return res.status(404).json({ mensaje: "Consulta no encontrada" });

    const esRepresentante = req.usuario.rol === "representante";
    const usuario = await obtenerUsuarioConPersona(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // Sólo puede escribir la institución dueña del curso o el ciudadano que consultó
    if (esRepresentante) {
      const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
      if (consulta.institucion_id !== institucion_id) {
        return res.status(404).json({ mensaje: "Consulta no encontrada en tu institución" });
      }
    } else {
      const esDuenio =
        consulta.usuario_id === usuario.id ||
        (consulta.usuario_id === null && consulta.email === usuario.email_login);
      if (!esDuenio) return res.status(404).json({ mensaje: "Consulta no encontrada" });
    }

    const nuevo = await mensajesConsultaModel.create({
      consulta_id: consulta.id,
      usuario_id: usuario.id,
      autor: esRepresentante ? "representante" : "ciudadano",
      mensaje: texto,
    });

    const tituloCurso = consulta.curso?.titulo || "el curso";
    let aviso = "Mensaje enviado";

    if (esRepresentante) {
      // Si el ciudadano había borrado la conversación, vuelve a aparecerle con la respuesta nueva
      await consulta.update({ estado: "respondida", novedad_ciudadano: true, oculta_ciudadano: false });

      // Si la consulta es vieja (de visitante), se busca una cuenta con ese email
      let destinatario = consulta.usuario_id;
      if (!destinatario) {
        const cuenta = await usuariosModel.findOne({ where: { email_login: consulta.email }, attributes: ["id"] });
        destinatario = cuenta?.id || null;
      }
      if (destinatario) {
        crearNotificacionUsuario({
          usuario_id: destinatario,
          tipo: "consulta",
          titulo: `${consulta.institucion?.nombre || "La institución"} respondió tu consulta`,
          mensaje: `Sobre "${tituloCurso}": ${texto}`,
          url: "dashboard.html#mis-consultas",
          agrupar: true,
          mensajeAgrupado: (n) => `Tenés ${n} respuestas nuevas sobre "${tituloCurso}"`,
        }).catch((e) => console.error("Error notificando respuesta de consulta:", e.message));
        aviso = "Respuesta enviada. El ciudadano la va a ver en su panel.";
      } else {
        aviso = "Respuesta guardada. Esta persona todavía no tiene cuenta: la va a ver cuando inicie sesión con ese email.";
      }
    } else {
      // Al vincular una consulta vieja por email, queda asociada a la cuenta
      // Si la institución había borrado la conversación, vuelve a aparecerle con el mensaje nuevo
      await consulta.update({ estado: "nueva", novedad_ciudadano: false, usuario_id: usuario.id, oculta_representante: false });
      notificarRepresentantes(consulta.institucion_id, {
        tipo: "consulta",
        titulo: `Nuevo mensaje en la consulta sobre "${tituloCurso}"`,
        mensaje: `${nombreCompleto(usuario)}: ${texto}`,
        url: "dashboard.html#consultas",
      }).catch((e) => console.error("Error notificando mensaje de consulta:", e.message));
      aviso = "Mensaje enviado a la institución.";
    }

    return res.status(201).json({ mensaje: aviso, id: nuevo.id });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "No se pudo enviar el mensaje", error: error.message });
  }
};

// ============================================================
// REPRESENTANTE: gestión de las consultas de su institución
// ============================================================
export const verMisConsultas = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const where = { institucion_id, oculta_representante: false };
    if (["nueva", "leida", "respondida"].includes(req.query.estado)) where.estado = req.query.estado;

    const consultas = await consultasCursoModel.findAll({
      where,
      include: incluirConversacion,
      order: ordenConversacion,
      limit: 100,
    });
    const nuevas = await consultasCursoModel.count({ where: { institucion_id, estado: "nueva", oculta_representante: false } });
    return res.status(200).json({ mensaje: "Consultas recibidas", nuevas, consultas });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener las consultas", error: error.message });
  }
};

export const cambiarEstadoConsulta = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!["nueva", "leida", "respondida"].includes(estado)) {
      return res.status(400).json({ mensaje: "Estado inválido" });
    }
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const [actualizadas] = await consultasCursoModel.update(
      { estado },
      { where: { id: req.params.id, institucion_id } },
    );
    if (!actualizadas) return res.status(404).json({ mensaje: "Consulta no encontrada en tu institución" });
    return res.status(200).json({ mensaje: "Consulta actualizada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al actualizar la consulta", error: error.message });
  }
};

// ============================================================
// CIUDADANO o REPRESENTANTE: borra la conversación de SU panel
// DELETE /api/consultas/:id
// El otro lado la sigue viendo. Si ya la había borrado también, se elimina del todo.
// ============================================================
export const borrarConsulta = async (req, res) => {
  try {
    const consulta = await consultasCursoModel.findByPk(req.params.id);
    if (!consulta) return res.status(404).json({ mensaje: "Consulta no encontrada" });

    const esRepresentante = req.usuario.rol === "representante";
    if (esRepresentante) {
      const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
      if (consulta.institucion_id !== institucion_id) {
        return res.status(404).json({ mensaje: "Consulta no encontrada en tu institución" });
      }
    } else {
      const usuario = await obtenerUsuarioConPersona(req.usuario.id);
      const esDuenio =
        usuario &&
        (consulta.usuario_id === usuario.id ||
          (consulta.usuario_id === null && consulta.email === usuario.email_login));
      if (!esDuenio) return res.status(404).json({ mensaje: "Consulta no encontrada" });
    }

    const yaOcultaDelOtroLado = esRepresentante ? consulta.oculta_ciudadano : consulta.oculta_representante;
    if (yaOcultaDelOtroLado) {
      await mensajesConsultaModel.destroy({ where: { consulta_id: consulta.id } });
      await consulta.destroy();
    } else {
      await consulta.update(esRepresentante ? { oculta_representante: true } : { oculta_ciudadano: true });
    }
    return res.status(200).json({ mensaje: "Conversación borrada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "No se pudo borrar la conversación", error: error.message });
  }
};

// ============================================================
// REPRESENTANTE: vacía su bandeja de consultas
// DELETE /api/consultas/mias?estado=respondida   (sin estado = todas)
// Igual que borrar una: los ciudadanos las siguen viendo en su panel,
// y si el ciudadano ya la había borrado, se elimina del todo.
// ============================================================
export const vaciarMisConsultas = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    if (!institucion_id) return res.status(400).json({ mensaje: "Tu usuario no está vinculado a ninguna institución" });
    const where = { institucion_id, oculta_representante: false };
    if (["nueva", "leida", "respondida"].includes(req.query.estado)) where.estado = req.query.estado;

    const consultas = await consultasCursoModel.findAll({ where, attributes: ["id", "oculta_ciudadano"] });
    const aEliminar = consultas.filter((c) => c.oculta_ciudadano).map((c) => c.id);
    const aOcultar = consultas.filter((c) => !c.oculta_ciudadano).map((c) => c.id);

    if (aEliminar.length) {
      await mensajesConsultaModel.destroy({ where: { consulta_id: aEliminar } });
      await consultasCursoModel.destroy({ where: { id: aEliminar } });
    }
    if (aOcultar.length) {
      await consultasCursoModel.update({ oculta_representante: true }, { where: { id: aOcultar } });
    }
    const total = consultas.length;
    return res.status(200).json({
      mensaje: total === 0 ? "No había consultas para borrar" : total === 1 ? "Se borró 1 conversación" : `Se borraron ${total} conversaciones`,
      total,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "No se pudieron borrar las consultas", error: error.message });
  }
};
