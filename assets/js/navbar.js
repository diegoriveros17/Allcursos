// assets/js/navbar.js
document.addEventListener("DOMContentLoaded", () => {
  const menuDinamico = document.getElementById("menuDinamico");
  if (!menuDinamico) return;

  const sesion = obtenerSesion();

  if (sesion) {
    const enlacePanel =
      sesion.rol === "representante"
        ? `<a class="nav-link text-warning" href="dashboard.html"><i class="bi bi-building-gear me-1"></i>Panel Institucional</a>`
        : `<a class="nav-link text-warning" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Mi Panel</a>`;

    menuDinamico.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="index.html">Inicio</a>
      </li>
      <li class="nav-item">
        ${enlacePanel}
      </li>
      <li class="nav-item ms-lg-3">
        <span class="nav-link text-info"><i class="bi bi-person-fill me-1"></i>${sesion.nombre} ${sesion.apellido}</span>
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
      <li class="nav-item">
        <a class="nav-link" href="login.html">Iniciar Sesión</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="formulario_registro.html">Registrate</a>
      </li>
    `;
  }
});
