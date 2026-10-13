// src/utils/email.service.js
import nodemailer from "nodemailer";

let transportador = null;

function obtenerTransportador() {
  if (transportador) return transportador;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_TLS_REJECT_UNAUTHORIZED } =
    process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Sin configuración: se usará el modo "log" (ver enviarEmail)
  }

  const puerto = Number(SMTP_PORT) || 587;
  // secure=true -> TLS directo (puerto 465). Con 587 se usa STARTTLS automáticamente.
  const secure = SMTP_SECURE ? SMTP_SECURE === "true" : puerto === 465;

  transportador = nodemailer.createTransport({
    host: SMTP_HOST,
    port: puerto,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Evita que un envío quede colgado para siempre si el SMTP no responde
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Sólo poner SMTP_TLS_REJECT_UNAUTHORIZED=false para un SMTP interno con certificado propio
    tls: { rejectUnauthorized: SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
  });
  return transportador;
}

// Comprueba al arrancar que las credenciales SMTP sirven (se llama desde app.js).
export async function verificarConexionEmail() {
  const transporte = obtenerTransportador();
  if (!transporte) {
    console.log("[Email] SMTP sin configurar: los emails se mostrarán por consola (modo simulado).");
    return;
  }
  try {
    await transporte.verify();
    console.log("[Email] Conexión SMTP verificada correctamente.");
  } catch (error) {
    console.warn(`[Email] No se pudo verificar el SMTP: ${error.message}`);
  }
}

// Envía un email real si hay SMTP configurado en el .env; si no, sólo lo
// deja registrado en consola para no romper el flujo en desarrollo.
// `replyTo` permite que el representante responda directo al visitante.
// Importante: el SMTP envía igual desde cualquier IP/host donde corra el
// servidor; lo que dependía de "localhost" eran los LINKS dentro del mail
// (ver src/config/appUrl.js).
export async function enviarEmail({ to, subject, html, replyTo }) {
  const remitente = process.env.SMTP_FROM || "no-responder@allcursos.local";
  const transporte = obtenerTransportador();

  if (!transporte) {
    console.log("\n📧 [EMAIL SIMULADO - configura SMTP_HOST/SMTP_USER/SMTP_PASS en .env para enviarlo de verdad]");
    console.log(`Para: ${Array.isArray(to) ? to.join(", ") : to}`);
    if (replyTo) console.log(`Responder a: ${replyTo}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Contenido: ${html.replace(/<[^>]+>/g, " ")}\n`);
    return { simulado: true };
  }

  try {
    await transporte.sendMail({
      from: remitente,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
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
