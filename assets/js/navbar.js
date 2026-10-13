// assets/js/navbar.js
document.addEventListener("DOMContentLoaded", () => {
  const menuDinamico = document.getElementById("menuDinamico");
  if (!menuDinamico) return;

  const sesion = obtenerSesion();

  const enlaceVerificar = `
    <li class="nav-item">
      <a class="nav-link" href="verificar_certificado.html" title="Verificar un certificado">
        <i class="bi bi-patch-check me-1"></i><span class="d-lg-none d-xl-inline">Verificar Certificado</span>
      </a>
    </li>
  `;

  if (sesion) {
    let enlacePanel = `<a class="nav-link" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Mi Panel</a>`;
    if (sesion.rol === "representante") {
      enlacePanel = `<a class="nav-link" href="dashboard.html"><i class="bi bi-building-gear me-1"></i>Panel Institucional</a>`;
    } else if (sesion.rol === "administrador") {
      enlacePanel = `<a class="nav-link" style="color: var(--brand-primary); font-weight: 700;" href="admin.html"><i class="bi bi-shield-lock-fill me-1"></i>Panel Admin</a>`;
    }

    menuDinamico.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="index.html">Inicio</a>
      </li>
      <li class="nav-item">
        ${enlacePanel}
      </li>
      ${enlaceVerificar}
      ${sesion.rol !== "administrador" && window.bootstrap ? htmlCampanita() : ""}
      <li class="nav-item ms-lg-3">
        <a class="nav-link" href="configuracion.html" title="Configuración de tu cuenta">
          ${
            sesion.avatar_url
              ? `<img src="${sesion.avatar_url}" alt="" class="rounded-circle me-1" style="width:22px;height:22px;object-fit:cover;">`
              : `<i class="bi bi-person-circle me-1"></i>`
          }${sesion.nombre}
        </a>
      </li>
      <li class="nav-item ms-lg-auto">
        <a class="nav-link text-danger" href="#" id="btnCerrarSesion"><i class="bi bi-box-arrow-right me-1"></i>Cerrar Sesión</a>
      </li>
    `;

    document
      .getElementById("btnCerrarSesion")
      .addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesion();
        window.location.href = "index.html";
      });

    if (document.getElementById("navNotificaciones")) iniciarCampanita();
  } else {
    menuDinamico.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="index.html">Inicio</a>
      </li>
      ${enlaceVerificar}
      <li class="nav-item ms-lg-auto">
        <a class="nav-link" href="login.html">Iniciar Sesión</a>
      </li>
      <li class="nav-item">
        <a class="btn btn-sm btn-dark ms-lg-2" href="formulario_registro.html">Registrate</a>
      </li>
    `;
  }
});


// ============================================================
// CAMPANITA DE NOTIFICACIONES
// Contador de no leídas + desplegable con las más recientes.
// Endpoints: GET /notificaciones/bandeja, PUT /notificaciones/bandeja/:id/leida,
//            PUT /notificaciones/bandeja/leer-todas
// ============================================================
const ICONOS_NOTIFICACION = {
  consulta: "bi-chat-dots-fill text-primary",
  encuesta_respuesta: "bi-bar-chart-line-fill text-success",
  encuesta_nueva: "bi-clipboard2-check-fill text-info",
  inscripcion: "bi-person-plus-fill text-success",
  curso_nuevo: "bi-journal-plus text-primary",
  sistema: "bi-info-circle-fill text-secondary",
};
const INTERVALO_CAMPANITA_MS = 60_000;

function htmlCampanita() {
  return `
    <li class="nav-item dropdown ms-lg-2" id="navNotificaciones">
      <a class="nav-link position-relative" href="#" id="btnCampanita" role="button"
         data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Notificaciones">
        <i class="bi bi-bell-fill"></i>
        <span id="badgeNotificaciones" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none"
              style="font-size:.65rem;">0</span>
      </a>
      <div class="dropdown-menu dropdown-menu-end p-0 shadow" style="width:360px;max-width:92vw;">
        <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
          <strong>Notificaciones</strong>
          <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" id="btnLeerTodasNotificaciones">Marcar todas como leídas</button>
        </div>
        <div id="listaNotificaciones" style="max-height:380px;overflow-y:auto;"></div>
      </div>
    </li>`;
}

function tiempoRelativoCampanita(fecha) {
  const d = new Date(fecha);
  if (isNaN(d)) return "";
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return "hace un instante";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias < 30 ? `hace ${dias} ${dias === 1 ? "día" : "días"}` : d.toLocaleDateString("es-AR");
}

function iniciarCampanita() {
  const badge = document.getElementById("badgeNotificaciones");
  const lista = document.getElementById("listaNotificaciones");
  const btnTodas = document.getElementById("btnLeerTodasNotificaciones");
  const menu = document.getElementById("navNotificaciones");

  const pintarBadge = (n) => {
    badge.textContent = n > 99 ? "99+" : n;
    badge.classList.toggle("d-none", n === 0);
    badge.setAttribute("aria-label", `${n} notificaciones sin leer`);
  };

  const filaNotificacion = (n) => {
    const fila = document.createElement("a");
    fila.href = n.url || "#";
    fila.className = `dropdown-item d-flex gap-2 align-items-start py-2 border-bottom ${n.leida ? "" : "bg-primary-subtle"}`;
    fila.style.whiteSpace = "normal";

    const icono = document.createElement("i");
    icono.className = `bi ${ICONOS_NOTIFICACION[n.tipo] || ICONOS_NOTIFICACION.sistema} mt-1`;

    const texto = document.createElement("div");
    texto.className = "flex-grow-1 overflow-hidden";
    const titulo = document.createElement("div");
    titulo.className = n.leida ? "small" : "small fw-semibold";
    titulo.textContent = n.titulo; // textContent: nunca se interpreta como HTML
    const detalle = document.createElement("div");
    detalle.className = "small text-muted text-truncate";
    detalle.textContent = n.mensaje || "";
    const hora = document.createElement("div");
    hora.className = "text-muted";
    hora.style.fontSize = ".7rem";
    hora.textContent = tiempoRelativoCampanita(n.fecha_creacion);
    texto.append(titulo, detalle, hora);
    fila.append(icono, texto);

    if (!n.leida) {
      const punto = document.createElement("span");
      punto.className = "bg-primary rounded-circle flex-shrink-0 mt-2";
      punto.style.cssText = "width:8px;height:8px;";
      fila.append(punto);
    }

    fila.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!n.leida) await apiFetch(`/notificaciones/bandeja/${n.id}/leida`, { method: "PUT" });
      if (n.url) window.location.href = n.url;
      else cargar();
    });
    return fila;
  };

  async function cargar() {
    const { ok, data } = await apiFetch("/notificaciones/bandeja?limite=15");
    if (!ok) return;
    pintarBadge(data.no_leidas);
    btnTodas.classList.toggle("d-none", data.no_leidas === 0);

    if (data.notificaciones.length === 0) {
      const vacio = document.createElement("div");
      vacio.className = "text-center text-muted small py-4";
      vacio.textContent = "No tenés notificaciones por ahora.";
      lista.replaceChildren(vacio);
    } else {
      lista.replaceChildren(...data.notificaciones.map(filaNotificacion));
    }
  }

  btnTodas.addEventListener("click", async () => {
    await apiFetch("/notificaciones/bandeja/leer-todas", { method: "PUT" });
    cargar();
  });

  // Al abrir el desplegable se refresca; además se consulta cada minuto (si la pestaña está visible)
  menu.addEventListener("show.bs.dropdown", cargar);
  setInterval(() => {
    if (!document.hidden && obtenerToken()) cargar();
  }, INTERVALO_CAMPANITA_MS);

  cargar();
}
