// assets/js/navbar.js
// Arma la barra de navegación de todas las páginas: marca, enlaces y, a la derecha,
// los botones de sesión (Iniciar sesión / Registrate) o el menú del usuario logueado.

const ETIQUETAS_ROL = { ciudadano: "Estudiante", representante: "Representante", administrador: "Administrador" };

// Escapa texto antes de meterlo en HTML (nombre, foto, etc. vienen del usuario)
function escaparNav(texto = "") {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Iniciales para el avatar cuando el usuario no tiene foto (ej: "Juan Pérez" -> "JP")
function inicialesNav(sesion) {
  const partes = [sesion.nombre, sesion.apellido].filter(Boolean).join(" ").trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

function avatarNav(sesion, clase) {
  return sesion.avatar_url
    ? `<img src="${escaparNav(sesion.avatar_url)}" alt="" class="${clase}">`
    : `<span class="${clase} avatar-iniciales">${escaparNav(inicialesNav(sesion))}</span>`;
}

// Enlace del menú central; se marca "active" si es la página actual
function enlaceNav(href, icono, texto) {
  const paginaActual = window.location.pathname.split("/").pop() || "index.html";
  const activo = paginaActual === href;
  return `
    <li class="nav-item">
      <a class="nav-link ${activo ? "active" : ""}" href="${href}" ${activo ? 'aria-current="page"' : ""}>
        <i class="bi ${icono} me-1"></i>${texto}
      </a>
    </li>`;
}

// Reemplaza el contenido de la navbar fija por una estructura común (así todas las páginas se ven iguales)
function prepararEstructuraNavbar(menuDinamico) {
  const nav = menuDinamico.closest("nav");
  if (!nav || !nav.classList.contains("fixed-top")) return null; // Páginas con otra navbar: sólo se completa el menú

  nav.className = "navbar navbar-expand-lg fixed-top navbar-allcursos";
  nav.setAttribute("data-bs-theme", "dark"); // Íconos y menú hamburguesa claros sobre fondo oscuro
  nav.setAttribute("aria-label", "Navegación principal");
  if (document.querySelector(".hero-banner")) nav.classList.add("navbar-sobre-hero"); // En el inicio arranca transparente sobre el banner

  nav.innerHTML = `
    <div class="container">
      <a class="navbar-brand marca-allcursos" href="index.html">
        <span class="marca-icono"><i class="bi bi-mortarboard-fill"></i></span>
        <span>All<span class="marca-acento">Cursos</span></span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navPrincipal"
              aria-controls="navPrincipal" aria-expanded="false" aria-label="Abrir menú">
        <i class="bi bi-list"></i>
      </button>
      <div class="collapse navbar-collapse" id="navPrincipal">
        <ul class="navbar-nav mx-lg-auto" id="menuDinamico"></ul>
        <ul class="navbar-nav nav-acciones" id="navAcciones"></ul>
      </div>
    </div>`;
  return { menu: nav.querySelector("#menuDinamico"), acciones: nav.querySelector("#navAcciones") };
}

document.addEventListener("DOMContentLoaded", () => {
  let menuDinamico = document.getElementById("menuDinamico");
  if (!menuDinamico) return;

  const estructura = prepararEstructuraNavbar(menuDinamico);
  if (estructura) menuDinamico = estructura.menu;
  const conBootstrap = Boolean(window.bootstrap); // Los desplegables necesitan el JS de Bootstrap

  const sesion = obtenerSesion();

  // El representante no ve el inicio público: su "inicio" es el panel con sus propios cursos
  const esRepresentante = sesion?.rol === "representante";
  let enlaces = esRepresentante ? "" : enlaceNav("index.html", "bi-house-door", "Inicio");
  if (esRepresentante) document.querySelector(".marca-allcursos")?.setAttribute("href", "dashboard.html");
  let acciones = "";

  if (sesion) {
    const panel =
      sesion.rol === "administrador"
        ? { href: "admin.html", icono: "bi-shield-lock", texto: "Panel Admin" }
        : sesion.rol === "representante"
          ? { href: "dashboard.html", icono: "bi-building-gear", texto: "Panel Institucional" }
          : { href: "dashboard.html", icono: "bi-speedometer2", texto: "Mi Panel" };

    enlaces += enlaceNav(panel.href, panel.icono, panel.texto);
    enlaces += enlaceNav("verificar_certificado.html", "bi-patch-check", "Verificar certificado");

    const nombre = escaparNav(sesion.nombre || "Mi cuenta");
    const nombreCompleto = escaparNav([sesion.nombre, sesion.apellido].filter(Boolean).join(" "));
    const rol = ETIQUETAS_ROL[sesion.rol] || sesion.rol || "";

    if (conBootstrap) {
      acciones = `
        ${sesion.rol !== "administrador" ? htmlCampanita() : ""}
        <li class="nav-item dropdown">
          <a class="nav-link nav-usuario dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            ${avatarNav(sesion, "avatar-nav")}
            <span class="nav-usuario-nombre">${nombre}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end menu-usuario">
            <li class="menu-usuario-cabecera">
              ${avatarNav(sesion, "avatar-menu")}
              <div class="overflow-hidden">
                <div class="fw-semibold text-truncate">${nombreCompleto || nombre}</div>
                <div class="small text-muted text-truncate">${escaparNav(sesion.email_login || "")}</div>
                ${rol ? `<span class="badge rol-badge mt-1">${escaparNav(rol)}</span>` : ""}
              </div>
            </li>
            <li><a class="dropdown-item" href="${panel.href}"><i class="bi ${panel.icono}"></i>${panel.texto}</a></li>
            <li><a class="dropdown-item" href="configuracion.html"><i class="bi bi-gear"></i>Configuración de la cuenta</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button type="button" class="dropdown-item item-cerrar-sesion" id="btnCerrarSesion"><i class="bi bi-box-arrow-right"></i>Cerrar sesión</button></li>
          </ul>
        </li>`;
    } else {
      // Sin Bootstrap JS no hay desplegable: se muestran enlaces simples
      acciones = `
        <li class="nav-item"><a class="nav-link nav-usuario" href="configuracion.html">${avatarNav(sesion, "avatar-nav")}<span class="nav-usuario-nombre">${nombre}</span></a></li>
        <li class="nav-item"><button type="button" class="btn btn-nav-secundario" id="btnCerrarSesion"><i class="bi bi-box-arrow-right me-1"></i>Cerrar sesión</button></li>`;
    }
  } else {
    enlaces += enlaceNav("verificar_certificado.html", "bi-patch-check", "Verificar certificado");
    acciones = `
      <li class="nav-item"><a class="btn btn-nav-secundario" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Iniciar sesión</a></li>
      <li class="nav-item"><a class="btn btn-nav-principal" href="formulario_registro.html">Registrate<i class="bi bi-arrow-right ms-1"></i></a></li>`;
  }

  if (estructura) {
    menuDinamico.innerHTML = enlaces;
    estructura.acciones.innerHTML = acciones;
    // Los desplegables (usuario, campanita) se ven claros aunque la barra sea oscura
    estructura.acciones.querySelectorAll(".dropdown-menu").forEach((m) => m.setAttribute("data-bs-theme", "light"));
    // Sin Bootstrap JS el botón hamburguesa no funciona: el menú queda siempre abierto
    if (!conBootstrap) document.getElementById("navPrincipal")?.classList.add("show");
  } else {
    menuDinamico.innerHTML = enlaces + acciones;
  }

  const btnCerrarSesion = document.getElementById("btnCerrarSesion");
  btnCerrarSesion?.addEventListener("click", async () => {
    // Pide confirmación con el modal prolijo de api.js (si Bootstrap está cargado)
    if (conBootstrap) {
      const confirmar = await confirmarAccion("Vas a salir de tu cuenta en este dispositivo.", {
        titulo: "¿Cerrar sesión?",
        textoConfirmar: "Cerrar sesión",
      });
      if (!confirmar) return;
    }
    cerrarSesion();
    try { sessionStorage.setItem("avisoSesionCerrada", "1"); } catch {} // Para mostrar el aviso en la página siguiente
    window.location.href = "index.html";
  });

  if (document.getElementById("navNotificaciones")) iniciarCampanita();

  // Aviso "Cerraste sesión" después de redirigir
  try {
    if (sessionStorage.getItem("avisoSesionCerrada")) {
      sessionStorage.removeItem("avisoSesionCerrada");
      if (conBootstrap) mostrarToast("Cerraste sesión correctamente. ¡Hasta pronto!", "exito");
    }
  } catch {}
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
