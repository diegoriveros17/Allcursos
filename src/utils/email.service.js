// src/utils/email.service.js
import nodemailer from "nodemailer";

let transportador = null;

function obtenerTransportador() {
  if (transportador) return transportador;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Sin configuración: se usará el modo "log" (ver enviarEmail)
  }

  transportador = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transportador;
}

// Envía un email real si hay SMTP configurado en el .env; si no, sólo lo
// deja registrado en consola para no romper el flujo en desarrollo.
export async function enviarEmail({ to, subject, html }) {
  const remitente = process.env.SMTP_FROM || "no-responder@allcursos.local";
  const transporte = obtenerTransportador();

  if (!transporte) {
    console.log("\n📧 [EMAIL SIMULADO - configura SMTP_HOST/SMTP_USER/SMTP_PASS en .env para enviarlo de verdad]");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Contenido: ${html.replace(/<[^>]+>/g, " ")}\n`);
    return { simulado: true };
  }

  try {
    await transporte.sendMail({ from: remitente, to, subject, html });
    return { simulado: false, enviado: true };
  } catch (error) {
    console.error("Error al enviar email:", error.message);
    return { simulado: false, enviado: false, error: error.message };
  }
}

// El proyecto no tiene ningún proveedor de WhatsApp integrado (se necesitaría
// algo como la API de WhatsApp Business o Twilio). Por ahora sólo se deja
// constancia en consola/BD para no bloquear el flujo de notificaciones.
export async function enviarWhatsApp({ to, mensaje }) {
  console.log(`\n📱 [WHATSAPP SIMULADO - no hay proveedor integrado todavía]`);
  console.log(`Para: ${to}`);
  console.log(`Mensaje: ${mensaje}\n`);
  return { simulado: true };
}

// Tampoco hay un proveedor de SMS conectado (se necesitaría algo como
// Twilio o un gateway local). Se deja registrado por consola para no
// bloquear el flujo de verificación de contacto.
export async function enviarSMS({ to, mensaje }) {
  console.log(`\n💬 [SMS SIMULADO - no hay proveedor integrado todavía]`);
  console.log(`Para: ${to}`);
  console.log(`Mensaje: ${mensaje}\n`);
  return { simulado: true };
}
