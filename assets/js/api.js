// assets/js/api.js
// Punto único de comunicación con el backend. Como el frontend ahora se
// sirve desde el mismo servidor Express, usamos el mismo origen.
const API_URL = `${window.location.origin}/api`;

function obtenerToken() {
  return localStorage.getItem("token");
}

function obtenerSesion() {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
}

function guardarSesion(usuario, token) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
  localStorage.setItem("token", token);
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
}

// Envoltorio de fetch: agrega el header Authorization automáticamente si hay
// sesión, arma la URL completa y devuelve siempre { ok, status, data }.
async function apiFetch(ruta, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = obtenerToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { mensaje: "No se pudo conectar con el servidor backend." },
    };
  }

  let data = {};
  try {
    data = await respuesta.json();
  } catch (error) {
    data = {};
  }

  // Si el token venció o es inválido, limpiamos la sesión local
  if (respuesta.status === 401 && token) {
    cerrarSesion();
  }

  return { ok: respuesta.ok, status: respuesta.status, data };
}

// Igual que apiFetch, pero para enviar FormData (por ejemplo, con una imagen).
// No se setea "Content-Type": el navegador arma el boundary automáticamente.
async function apiFetchForm(ruta, { method = "POST", formData } = {}) {
  const headers = {};
  const token = obtenerToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: formData,
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { mensaje: "No se pudo conectar con el servidor backend." },
    };
  }

  let data = {};
  try {
    data = await respuesta.json();
  } catch (error) {
    data = {};
  }

  if (respuesta.status === 401 && token) cerrarSesion();

  return { ok: respuesta.ok, status: respuesta.status, data };
}
