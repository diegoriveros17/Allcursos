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
