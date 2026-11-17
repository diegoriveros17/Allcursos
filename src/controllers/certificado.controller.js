import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { inscripcionesModel } from "../models/inscripciones.model.js";
import { usuariosModel } from "../models/usuario.model.js";
import { personasModel } from "../models/persona.model.js";
import { cursosModel } from "../models/cursos.model.js";
import { institucionesModel } from "../models/instituciones.model.js";
import { certificadosModel } from "../models/certificado.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js";
import { construirUrl } from "../config/appUrl.js";
import { crearNotificacionUsuario } from "../utils/notificaciones.service.js";

const generarCodigoVerificacion = () =>
  crypto.randomBytes(6).toString("hex").toUpperCase();

// Genera (o reutiliza si ya existe) el registro de certificado y devuelve el PDF.
export const descargarCertificado = async (req, res) => {
  try {
    const inscripcion = await inscripcionesModel.findByPk(req.params.id, {
      include: [
        {
          model: usuariosModel,
          as: "usuario",
          include: [{ model: personasModel, as: "persona" }],
        },
        {
          model: cursosModel,
          as: "curso",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
    });

    if (!inscripcion)
      return res.status(404).json({ mensaje: "Inscripción no encontrada" });

    const esDueño = inscripcion.usuario_id === req.usuario.id;
    let esRepresentanteDelCurso = false;
    if (!esDueño && req.usuario.rol === "representante") {
      const representacion = await representanteInstituModel.findOne({
        where: {
          usuario_id: req.usuario.id,
          institucion_id: inscripcion.curso.institucion_id,
        },
      });
      esRepresentanteDelCurso = !!representacion;
    }
    if (!esDueño && !esRepresentanteDelCurso) {
      return res
        .status(403)
        .json({ mensaje: "No tienes permisos para ver este certificado" });
    }

    // El certificado sólo existe si la institución lo emitió: terminar la cursada no alcanza,
    // el representante tiene que confirmar que el alumno cumplió (asistencia, evaluaciones, etc.)
    const certificado = await certificadosModel.findOne({
      where: { inscripcion_id: inscripcion.id },
    });
    if (!certificado || certificado.anulado) {
      return res.status(400).json({
        mensaje: certificado?.anulado
          ? "La institución anuló este certificado. Si creés que es un error, escribile desde Consultas."
          : "Tu certificado todavía no fue emitido. La institución lo emite cuando confirma que completaste el curso.",
      });
    }

    const persona = inscripcion.usuario.persona;
    const curso = inscripcion.curso;
    const institucion = curso.institucion;
    const nombreCompleto = `${persona.nombre} ${persona.apellido}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificado_${curso.titulo.replace(/\s+/g, "_")}.pdf"`,
    );

    const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: 50 });
    doc.pipe(res);

    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(3)
      .strokeColor("#0d6efd")
      .stroke();

    doc
      .fontSize(30)
      .fillColor("#0d6efd")
      .font("Helvetica-Bold")
      .text("CERTIFICADO DE FINALIZACIÓN", 0, 100, { align: "center" });

    doc
      .moveDown(2)
      .fontSize(14)
      .fillColor("#333333")
      .font("Helvetica")
      .text("Se certifica que", { align: "center" });

    doc
      .moveDown(0.5)
      .fontSize(26)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(nombreCompleto, { align: "center" });

    doc
      .moveDown(0.5)
      .fontSize(14)
      .fillColor("#333333")
      .font("Helvetica")
      .text("con DNI " + persona.dni + ", ha finalizado satisfactoriamente el curso", {
        align: "center",
      });

    doc
      .moveDown(0.5)
      .fontSize(20)
      .fillColor("#0d6efd")
      .font("Helvetica-Bold")
      .text(curso.titulo, { align: "center" });

    doc
      .moveDown(0.5)
      .fontSize(13)
      .fillColor("#333333")
      .font("Helvetica")
      .text(
        `dictado por ${institucion.nombre}` +
          (curso.duracion_horas ? ` con una carga horaria de ${curso.duracion_horas} horas.` : "."),
        { align: "center" },
      );

    const fecha = new Date(certificado.fecha_emision).toLocaleDateString("es-AR");
    doc
      .moveDown(3)
      .fontSize(11)
      .fillColor("#555555")
      .text(`Fecha de emisión: ${fecha}`, { align: "center" });
    doc.text(`Código de verificación: ${certificado.codigo_verificacion}`, {
      align: "center",
    });

    // QR que lleva directo a la página pública de verificación, con el
    // código ya cargado. Así, quien reciba el certificado (un empleador,
    // por ejemplo) puede confirmar su autenticidad escaneándolo con el
    // celular, sin tener que tipear el código a mano.
    const urlVerificacion = construirUrl(`verificar_certificado.html?codigo=${certificado.codigo_verificacion}`);
    try {
      const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
        margin: 1,
        width: 220,
        color: { dark: "#1f2937", light: "#ffffffff" },
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrTamaño = 90;
      doc.image(
        qrBuffer,
        doc.page.width - qrTamaño - 55,
        doc.page.height - qrTamaño - 55,
        { width: qrTamaño, height: qrTamaño },
      );
      doc
        .fontSize(7)
        .fillColor("#888888")
        .text("Escaneá para verificar", doc.page.width - qrTamaño - 55, doc.page.height - 55 + 4, {
          width: qrTamaño,
          align: "center",
        });
    } catch (errorQR) {
      console.error("No se pudo generar el QR del certificado:", errorQR.message);
    }

    doc.end();
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al generar el certificado", error: error.message });
  }
};

// Verificación pública (sin login): cualquiera con el código (o el QR)
// puede confirmar que un certificado es legítimo, sin exponer datos
// sensibles de más.
export const verificarCertificadoPublico = async (req, res) => {
  try {
    const { codigo } = req.params;
    const certificado = await certificadosModel.findOne({
      where: { codigo_verificacion: codigo },
      include: [
        {
          model: inscripcionesModel,
          as: "inscripcion",
          include: [
            {
              model: usuariosModel,
              as: "usuario",
              include: [{ model: personasModel, as: "persona" }],
            },
            {
              model: cursosModel,
              as: "curso",
              include: [{ model: institucionesModel, as: "institucion" }],
            },
          ],
        },
      ],
    });

    if (!certificado) {
      return res.status(404).json({
        valido: false,
        mensaje: "No se encontró ningún certificado con ese código.",
      });
    }
    if (certificado.anulado) {
      return res.status(200).json({
        valido: false,
        anulado: true,
        mensaje: "Este certificado fue anulado por la institución que lo emitió y ya no es válido.",
      });
    }

    const persona = certificado.inscripcion.usuario.persona;
    const curso = certificado.inscripcion.curso;

    return res.status(200).json({
      valido: true,
      mensaje: "Certificado válido.",
      certificado: {
        nombreCompleto: `${persona.nombre} ${persona.apellido}`,
        curso: curso.titulo,
        institucion: curso.institucion.nombre,
        duracion_horas: curso.duracion_horas,
        fecha_emision: certificado.fecha_emision,
        codigo_verificacion: certificado.codigo_verificacion,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al verificar el certificado", error: error.message });
  }
};

// ------------------------------------------------------------
// EMISIÓN Y ANULACIÓN (sólo el representante de la institución del curso)
// ------------------------------------------------------------

// Busca la inscripción y confirma que el usuario logueado representa a la institución del curso
async function inscripcionDelRepresentante(req) {
  const inscripcion = await inscripcionesModel.findByPk(req.params.id, {
    include: [
      { model: cursosModel, as: "curso" },
      { model: usuariosModel, as: "usuario", attributes: ["id"], include: [{ model: personasModel, as: "persona", attributes: ["nombre", "apellido"] }] },
    ],
  });
  if (!inscripcion) return { error: [404, "Inscripción no encontrada"] };
  const representacion = await representanteInstituModel.findOne({
    where: { usuario_id: req.usuario.id, institucion_id: inscripcion.curso.institucion_id },
  });
  if (!representacion) return { error: [403, "Sólo la institución que dicta el curso puede gestionar sus certificados"] };
  return { inscripcion };
}

// El representante confirma que el alumno cumplió con el curso y le emite el certificado.
// También pasa la inscripción a "Finalizado". Si el certificado estaba anulado, lo vuelve a habilitar con el mismo código.
export const emitirCertificado = async (req, res) => {
  try {
    const { inscripcion, error } = await inscripcionDelRepresentante(req);
    if (error) return res.status(error[0]).json({ mensaje: error[1] });

    if (!["Inscripto", "Cursando", "Finalizado"].includes(inscripcion.estado)) {
      return res.status(400).json({
        mensaje: inscripcion.estado === "Cancelado"
          ? "No se puede certificar a un alumno que se dio de baja"
          : "No se puede certificar a alguien que está en lista de espera",
      });
    }

    let certificado = await certificadosModel.findOne({ where: { inscripcion_id: inscripcion.id } });
    if (certificado && !certificado.anulado) {
      return res.status(400).json({ mensaje: "Este alumno ya tiene su certificado emitido" });
    }
    if (certificado) {
      await certificado.update({ anulado: false, fecha_anulacion: null, emitido_por: req.usuario.id, fecha_emision: new Date() });
    } else {
      certificado = await certificadosModel.create({
        inscripcion_id: inscripcion.id,
        fecha_emision: new Date(),
        codigo_verificacion: generarCodigoVerificacion(),
        emitido_por: req.usuario.id,
      });
    }
    if (inscripcion.estado !== "Finalizado") await inscripcion.update({ estado: "Finalizado" });

    // Aviso al alumno en su campanita
    crearNotificacionUsuario({
      usuario_id: inscripcion.usuario_id,
      tipo: "inscripcion",
      titulo: "¡Tu certificado está listo!",
      mensaje: `La institución emitió tu certificado de "${inscripcion.curso.titulo}". Descargalo desde Mi Panel.`,
      url: "dashboard.html#mis-cursos",
    }).catch((e) => console.error("Error notificando el certificado:", e.message));

    return res.status(200).json({
      mensaje: "Certificado emitido",
      certificado: { id: certificado.id, fecha_emision: certificado.fecha_emision, anulado: false, codigo_verificacion: certificado.codigo_verificacion },
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al emitir el certificado", error: error.message });
  }
};

// El representante anula un certificado emitido por error: el alumno ya no lo puede descargar
// y el QR pasa a indicar que fue anulado (no se borra, así queda el registro).
export const anularCertificado = async (req, res) => {
  try {
    const { inscripcion, error } = await inscripcionDelRepresentante(req);
    if (error) return res.status(error[0]).json({ mensaje: error[1] });

    const certificado = await certificadosModel.findOne({ where: { inscripcion_id: inscripcion.id } });
    if (!certificado || certificado.anulado) {
      return res.status(400).json({ mensaje: "Este alumno no tiene un certificado vigente" });
    }
    await certificado.update({ anulado: true, fecha_anulacion: new Date() });

    crearNotificacionUsuario({
      usuario_id: inscripcion.usuario_id,
      tipo: "inscripcion",
      titulo: "Certificado anulado",
      mensaje: `La institución anuló tu certificado de "${inscripcion.curso.titulo}". Si creés que es un error, escribile desde Consultas.`,
      url: "dashboard.html#mis-cursos",
    }).catch((e) => console.error("Error notificando la anulación:", e.message));

    return res.status(200).json({ mensaje: "Certificado anulado", certificado: { id: certificado.id, anulado: true } });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al anular el certificado", error: error.message });
  }
};
