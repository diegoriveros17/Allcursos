import {
  consultasCursoModel,
  cursosModel,
  institucionesModel,
  representanteInstituModel,
} from "../models/index.js";
import { notificarRepresentantes } from "../utils/notificaciones.service.js";
import { construirUrl } from "../config/appUrl.js";
import { escaparHtml } from "../utils/html.js";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const obtenerInstitucionDeRepresentante = async (usuarioReq) => {
  if (usuarioReq.institucion_id) return usuarioReq.institucion_id;
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: usuarioReq.id },
  });
  return representacion ? representacion.institucion_id : null;
};

// ============================================================
// PÚBLICO: un visitante (sin cuenta) consulta sobre un curso.
// POST /api/cursos/:id/consultas  { nombre, email, mensaje }
//  1) se guarda en la BD (para gestionarla desde el panel)
//  2) se avisa en la campanita de los representantes de la institución
//  3) se les envía un email con "Responder a" = el correo del visitante
// ============================================================
export const crearConsulta = async (req, res) => {
  try {
    const nombre = String(req.body.nombre ?? "").trim();
    const email = String(req.body.email ?? "").trim();
    const mensaje = String(req.body.mensaje ?? "").trim();

    // Honeypot: campo oculto que una persona nunca completa pero un bot sí.
    // Respondemos "ok" igual para no darle pistas al bot, pero no guardamos nada.
    if (req.body.sitio_web) {
      return res.status(201).json({ mensaje: "¡Consulta enviada!" });
    }

    const errores = [];
    if (nombre.length < 2 || nombre.length > 100) errores.push("Ingresá tu nombre (entre 2 y 100 caracteres)");
    if (!REGEX_EMAIL.test(email) || email.length > 150) errores.push("Ingresá un correo de contacto válido");
    if (mensaje.length < 10) errores.push("Escribí tu consulta (mínimo 10 caracteres)");
    if (mensaje.length > 2000) errores.push("La consulta no puede superar los 2000 caracteres");
    if (errores.length > 0) return res.status(400).json({ mensaje: errores[0], errores });

    const curso = await cursosModel.findByPk(req.params.id, {
      include: [{ model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] }],
    });
    if (!curso) return res.status(404).json({ mensaje: "Curso no encontrado" });

    const consulta = await consultasCursoModel.create({
      curso_id: curso.id,
      institucion_id: curso.institucion_id,
      nombre,
      email,
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
        replyTo: email, // el representante responde directo con "Responder"
        html: `
          <h2>Nueva consulta sobre tu curso</h2>
          <p><strong>Curso:</strong> ${escaparHtml(curso.titulo)}</p>
          <p><strong>De:</strong> ${escaparHtml(nombre)} &lt;${escaparHtml(email)}&gt;</p>
          <blockquote style="border-left:4px solid #0d6efd;margin:12px 0;padding:8px 12px;background:#f5f7fa;white-space:pre-wrap;">${escaparHtml(mensaje)}</blockquote>
          <p>Podés responder directamente a este correo, o gestionar la consulta desde tu panel:</p>
          <p><a href="${construirUrl("dashboard.html")}" style="background:#0d6efd;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Ir a mi panel</a></p>
        `,
      },
    }).catch((e) => console.error("Error notificando consulta:", e.message));

    return res.status(201).json({
      mensaje: "¡Consulta enviada! La institución se va a comunicar con vos al correo que dejaste.",
      id: consulta.id,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "No se pudo enviar la consulta", error: error.message });
  }
};

// ============================================================
// REPRESENTANTE: gestión de las consultas de su institución
// ============================================================
export const verMisConsultas = async (req, res) => {
  try {
    const institucion_id = await obtenerInstitucionDeRepresentante(req.usuario);
    const where = { institucion_id };
    if (["nueva", "leida", "respondida"].includes(req.query.estado)) where.estado = req.query.estado;

    const consultas = await consultasCursoModel.findAll({
      where,
      include: [{ model: cursosModel, as: "curso", attributes: ["id", "titulo"] }],
      order: [["fecha_creacion", "DESC"]],
      limit: 100,
    });
    const nuevas = await consultasCursoModel.count({ where: { institucion_id, estado: "nueva" } });
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
