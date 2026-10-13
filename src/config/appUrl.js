// src/config/appUrl.js
// Fuente única de verdad para "¿cuál es la URL pública de la app?".
// Se usa para armar enlaces dentro de emails, PDFs/QR de certificados, etc.
// Así nada queda con "localhost" clavado y todo funciona desde cualquier IP o dominio.
import os from "os";

const ES_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;

// Primera IPv4 "de red" de la máquina (ej. 192.168.1.35), ignorando loopback.
export function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const lista of Object.values(interfaces)) {
    for (const i of lista || []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return null;
}

// URL configurada A PROPÓSITO en el .env (o null si no hay ninguna).
//  1. APP_URL                -> dominio o IP pública completa (ej. https://allcursos.com.ar)
//  2. HOST_IP (+ PORT)       -> ej. HOST_IP=192.168.1.35  =>  http://192.168.1.35:3000
//  3. FRONTEND_URL (legado)  -> sólo si NO apunta a localhost
export function obtenerBaseUrlConfigurada() {
  const { APP_URL, HOST_IP, FRONTEND_URL, PORT } = process.env;
  const puerto = PORT || 3000;

  if (APP_URL && APP_URL.trim()) return APP_URL.trim().replace(/\/+$/, "");
  if (HOST_IP && HOST_IP.trim()) return `http://${HOST_IP.trim()}:${puerto}`;
  if (FRONTEND_URL && FRONTEND_URL.trim() && !ES_LOCAL.test(FRONTEND_URL.trim()))
    return FRONTEND_URL.trim().replace(/\/+$/, "");
  return null;
}

// URL base para los enlaces que arma el SERVIDOR (emails, QR de certificados...).
// Si no hay nada configurado se usa la IP de red detectada (pensado para desarrollo/LAN)
// y, como último recurso, localhost. Nunca se arma con el header Host de la petición:
// eso permitiría que un atacante haga que el mail de "recuperar contraseña" apunte a su sitio.
export function obtenerBaseUrl() {
  const configurada = obtenerBaseUrlConfigurada();
  if (configurada) return configurada;
  return `http://${obtenerIpLocal() || "localhost"}:${process.env.PORT || 3000}`;
}

// Arma una URL absoluta a partir de una ruta relativa: construirUrl("detalles.html?id=4")
export function construirUrl(ruta = "") {
  return `${obtenerBaseUrl()}/${String(ruta).replace(/^\/+/, "")}`;
}
