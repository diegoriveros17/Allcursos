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

// ============================================================
// TOASTS: reemplazo prolijo de alert()/confirm() para mensajes de
// éxito, error o aviso. Se inyecta un contenedor fijo la primera
// vez que se necesita.
// ============================================================
function obtenerContenedorToasts() {
  let contenedor = document.getElementById("toastContainerGlobal");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toastContainerGlobal";
    contenedor.className = "toast-container position-fixed top-0 end-0 p-3";
    contenedor.style.zIndex = "1080";
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

const ICONOS_TOAST = {
  exito: "bi-check-circle-fill text-success",
  error: "bi-x-circle-fill text-danger",
  info: "bi-info-circle-fill text-primary",
  advertencia: "bi-exclamation-triangle-fill text-warning",
};

/**
 * Muestra un mensaje flotante no bloqueante.
 * tipo: "exito" | "error" | "info" | "advertencia"
 */
function mostrarToast(mensaje, tipo = "info") {
  const contenedor = obtenerContenedorToasts();
  const id = `toast-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  const icono = ICONOS_TOAST[tipo] || ICONOS_TOAST.info;

  const toastEl = document.createElement("div");
  toastEl.id = id;
  toastEl.className = "toast align-items-center border-0 shadow-sm mb-2";
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icono}"></i>
        <span>${mensaje}</span>
      </div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>
  `;
  contenedor.appendChild(toastEl);

  // Si el bundle de Bootstrap está cargado, usamos su componente Toast;
  // si no, hacemos un fallback simple con un timeout.
  if (window.bootstrap && window.bootstrap.Toast) {
    const toast = new bootstrap.Toast(toastEl, { delay: 4500 });
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
    toast.show();
  } else {
    toastEl.classList.add("show");
    setTimeout(() => toastEl.remove(), 4500);
  }
}

/**
 * Reemplazo de confirm() con un modal de Bootstrap. Devuelve una Promise
 * que resuelve true/false según lo que elija el usuario.
 */
function confirmarAccion(mensaje, { titulo = "Confirmar", textoConfirmar = "Confirmar", peligroso = true } = {}) {
  return new Promise((resolve) => {
    let modalEl = document.getElementById("modalConfirmacionGlobal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "modalConfirmacionGlobal";
      modalEl.className = "modal fade";
      modalEl.setAttribute("tabindex", "-1");
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modalConfirmacionTitulo">Confirmar</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="modalConfirmacionMensaje"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn" id="modalConfirmacionBtnOk">Confirmar</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    modalEl.querySelector("#modalConfirmacionTitulo").textContent = titulo;
    modalEl.querySelector("#modalConfirmacionMensaje").textContent = mensaje;
    const btnOk = modalEl.querySelector("#modalConfirmacionBtnOk");
    btnOk.textContent = textoConfirmar;
    btnOk.className = `btn ${peligroso ? "btn-danger" : "btn-dark"}`;

    const modal = new bootstrap.Modal(modalEl);

    const limpiar = () => {
      btnOk.removeEventListener("click", onConfirmar);
      modalEl.removeEventListener("hidden.bs.modal", onCancelar);
    };
    const onConfirmar = () => {
      limpiar();
      modal.hide();
      resolve(true);
    };
    const onCancelar = () => {
      limpiar();
      resolve(false);
    };

    btnOk.addEventListener("click", onConfirmar);
    modalEl.addEventListener("hidden.bs.modal", onCancelar, { once: true });
    modal.show();
  });
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
