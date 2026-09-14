// assets/js/navbar.js
document.addEventListener("DOMContentLoaded", () => {
  const menuDinamico = document.getElementById("menuDinamico");
  if (!menuDinamico) return;

  const sesion = obtenerSesion();
  const ctaCrearCuenta = document.getElementById("ctaCrearCuenta");

  if (sesion) {
    // La llamada a registro solo es útil para visitantes sin una sesión activa.
    ctaCrearCuenta?.classList.add("d-none");
    const enlacePanel =
      sesion.rol === "representante"
        ? `<a class="nav-link text-warning" href="dashboard.html"><i class="bi bi-building-gear me-1"></i>Panel Institucional</a>`
        : `<a class="nav-link text-warning" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Mi Panel</a>`;

    const claveFoto = `fotoPerfil_${sesion.id || sesion.email_login}`;
    const fotoPerfil = localStorage.getItem(claveFoto);
    const iniciales = `${sesion.nombre?.[0] || "U"}${sesion.apellido?.[0] || ""}`.toUpperCase();
    const avatar = fotoPerfil
      ? `<img class="navbar-avatar" src="${fotoPerfil}" alt="Foto de perfil">`
      : `<span class="navbar-avatar navbar-avatar-initials">${iniciales}</span>`;

    menuDinamico.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="index.html">Inicio</a>
      </li>
      <li class="nav-item">
        ${enlacePanel}
      </li>
      <li class="nav-item dropdown ms-lg-3">
        <button class="nav-link dropdown-toggle position-relative bg-transparent border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" id="btnNotificaciones">
          <i class="bi bi-bell-fill"></i>
          <span class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle d-none" id="badgeNotificaciones" style="font-size:.6rem;"></span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end p-0" id="listaNotificaciones" style="min-width: 300px; max-height: 360px; overflow-y: auto;">
          <li class="dropdown-item text-muted small py-2">Cargando notificaciones...</li>
        </ul>
      </li>
      <li class="nav-item ms-lg-2">
        <a class="nav-link nav-profile-link" href="cuenta_perfil.html">${avatar}<span>${sesion.nombre} ${sesion.apellido}</span></a>
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

    cargarNotificaciones();
  } else {
    menuDinamico.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="index.html">Inicio</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="login.html">Iniciar Sesión</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="formulario_registro.html">Registrate</a>
      </li>
    `;
  }
});

async function cargarNotificaciones() {
  const lista = document.getElementById("listaNotificaciones");
  const badge = document.getElementById("badgeNotificaciones");
  if (!lista) return;

  const { ok, data } = await apiFetch("/notificaciones/mias");
  if (!ok) {
    lista.innerHTML = `<li class="dropdown-item text-muted small py-2">No se pudieron cargar tus notificaciones.</li>`;
    return;
  }

  const envios = data.envios || [];

  if (badge) {
    if (envios.length > 0) {
      badge.textContent = envios.length > 9 ? "9+" : envios.length;
      badge.classList.remove("d-none");
    } else {
      badge.classList.add("d-none");
    }
  }

  if (envios.length === 0) {
    lista.innerHTML = `<li class="dropdown-item text-muted small py-2">No tenés notificaciones todavía.</li>`;
    return;
  }

  lista.innerHTML = envios
    .slice(0, 15)
    .map((envio) => {
      const noti = envio.notificacion || {};
      const fecha = noti.fecha_creacion
        ? new Date(noti.fecha_creacion).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const href = noti.curso ? `detalles.html?id=${noti.curso.id}` : "#";
      return `
        <li>
          <a class="dropdown-item py-2 border-bottom" href="${href}">
            <div class="fw-semibold small">${noti.titulo || "Notificación"}</div>
            <div class="text-muted" style="font-size:.78rem;">${noti.mensaje || ""}</div>
            <div class="text-muted" style="font-size:.7rem;">${fecha}</div>
          </a>
        </li>
      `;
    })
    .join("");
}
