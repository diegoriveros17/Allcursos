// src/utils/html.js
// Escapa texto que escribió un usuario antes de meterlo en el HTML de un email.
// Sin esto, alguien podría enviar una consulta con <script> o enlaces falsos
// que se verían "oficiales" en el correo del representante.
export function escaparHtml(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
