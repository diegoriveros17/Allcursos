// assets/js/admin.js
document.addEventListener("DOMContentLoaded", () => {
  const sesion = obtenerSesion();

  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  if (sesion.rol !== "administrador") {
    mostrarToast("Acceso denegado: esta sección es exclusiva para administradores.", "error");
    setTimeout(() => (window.location.href = "dashboard.html"), 1200);
    return;
  }

  inicializarPanelAdmin();
});

let modalCambiarRolInstance = null;

function inicializarPanelAdmin() {
  // Cargar métricas iniciales
  cargarMetricas();

  // Cargar pestaña por defecto (solicitudes pendientes)
  cargarSolicitudesPendientes();

  // Listeners de pestañas para cargar datos bajo demanda
  document.getElementById("tab-pendientes")?.addEventListener("click", cargarSolicitudesPendientes);
  document.getElementById("tab-usuarios")?.addEventListener("click", () => cargarUsuarios());
  document.getElementById("tab-instituciones")?.addEventListener("click", cargarInstituciones);
  document.getElementById("tab-cursos")?.addEventListener("click", cargarCursosAdmin);
  document.getElementById("tab-reportes")?.addEventListener("click", () => cargarReportes("pendiente"));

  // Filtros de usuarios
  document.getElementById("btnFiltrarUsuarios")?.addEventListener("click", () => {
    const q = document.getElementById("filtroBusquedaUsuario").value.trim();
    const rol = document.getElementById("filtroRolUsuario").value;
    const estado = document.getElementById("filtroEstadoUsuario").value;
    cargarUsuarios({ q, rol, estado });
  });

  document.getElementById("filtroBusquedaUsuario")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnFiltrarUsuarios")?.click();
    }
  });

  // Filtros de reportes
  const btnFiltroPend = document.getElementById("filtroReportePendiente");
  const btnFiltroTodos = document.getElementById("filtroReporteTodos");

  btnFiltroPend?.addEventListener("click", () => {
    btnFiltroPend.classList.add("active");
    btnFiltroTodos?.classList.remove("active");
    cargarReportes("pendiente");
  });

  btnFiltroTodos?.addEventListener("click", () => {
    btnFiltroTodos.classList.add("active");
    btnFiltroPend?.classList.remove("active");
    cargarReportes("");
  });

  // Botón refrescar todo
  document.getElementById("btnRefrescarTodo")?.addEventListener("click", () => {
    cargarMetricas();
    const activeTab = document.querySelector("#adminTabs .nav-link.active");
    if (activeTab?.id === "tab-pendientes") cargarSolicitudesPendientes();
    if (activeTab?.id === "tab-usuarios") cargarUsuarios();
    if (activeTab?.id === "tab-instituciones") cargarInstituciones();
    if (activeTab?.id === "tab-cursos") cargarCursosAdmin();
    if (activeTab?.id === "tab-reportes") cargarReportes();
  });

  // Modal de cambiar rol
  const modalEl = document.getElementById("modalCambiarRol");
  if (modalEl) {
    modalCambiarRolInstance = new bootstrap.Modal(modalEl);
  }

  document.getElementById("btnConfirmarCambioRol")?.addEventListener("click", confirmarCambioRol);
}

// ============================================================
// 1. MÉTRICAS GENERALES
// ============================================================
async function cargarMetricas() {
  const { ok, data } = await apiFetch("/admin/metricas");
  if (!ok) return;

  document.getElementById("kpiUsuarios").textContent = data.totalUsuarios ?? 0;
  document.getElementById("kpiDetalleUsuarios").textContent =
    `${data.totalCiudadanos || 0} ciudadanos, ${data.totalRepresentantes || 0} representantes`;

  document.getElementById("kpiPendientes").textContent = data.representantesPendientes ?? 0;
  document.getElementById("kpiInstituciones").textContent = data.totalInstituciones ?? 0;
  document.getElementById("kpiReportes").textContent = data.reportesPendientes ?? 0;

  // Badges en las pestañas
  const badgePendientes = document.getElementById("badgeContadorPendientes");
  if (badgePendientes) {
    if (data.representantesPendientes > 0) {
      badgePendientes.textContent = data.representantesPendientes;
      badgePendientes.classList.remove("d-none");
    } else {
      badgePendientes.classList.add("d-none");
    }
  }

  const badgeReportes = document.getElementById("badgeContadorReportes");
  if (badgeReportes) {
    if (data.reportesPendientes > 0) {
      badgeReportes.textContent = data.reportesPendientes;
      badgeReportes.classList.remove("d-none");
    } else {
      badgeReportes.classList.add("d-none");
    }
  }
}

// ============================================================
// 2. SOLICITUDES DE REPRESENTANTES PENDIENTES
// ============================================================
async function cargarSolicitudesPendientes() {
  const tbody = document.getElementById("tablaPendientes");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Buscando solicitudes pendientes...</td></tr>`;

  const { ok, data } = await apiFetch("/admin/representantes/pendientes");
  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">${data.mensaje || "Error al cargar solicitudes"}</td></tr>`;
    return;
  }

  const pendientes = data.pendientes || [];
  if (pendientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-success">
          <i class="bi bi-check-circle fs-4 d-block mb-1"></i>
          No hay solicitudes pendientes. Todas las instituciones y representantes están al día.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = pendientes
    .map((p) => {
      const fecha = new Date(p.fecha_registro).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <tr>
          <td>
            <div class="fw-bold">${p.nombre}</div>
            <small class="text-muted">DNI: ${p.dni || "No informado"}</small>
          </td>
          <td>
            <a href="mailto:${p.email}">${p.email}</a>
            ${p.telefono ? `<div class="small text-muted"><i class="bi bi-telephone me-1"></i>${p.telefono}</div>` : ""}
          </td>
          <td>
            <span class="fw-bold text-primary">${p.institucion_nombre}</span>
          </td>
          <td><code>${p.institucion_cuit}</code></td>
          <td><span class="badge bg-light text-dark border">${p.cargo}</span></td>
          <td><small class="text-muted">${fecha}</small></td>
          <td class="text-end">
            <button class="btn btn-sm btn-success me-1" onclick="aprobarRepresentante(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
              <i class="bi bi-check-lg me-1"></i> Aprobar
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="rechazarRepresentante(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
              <i class="bi bi-x-lg me-1"></i> Rechazar
            </button>
          </td>
        </tr>`;
    })
    .join("");
}

window.aprobarRepresentante = async (id, nombre) => {
  const confirmado = await confirmarAccion(
    `¿Confirmas la aprobación de ${nombre} y su institución para publicar cursos?`,
    { titulo: "Aprobar representante", textoConfirmar: "Sí, aprobar", peligroso: false },
  );
  if (!confirmado) return;

  const { ok, data } = await apiFetch(`/admin/representantes/${id}/aprobar`, {
    method: "PUT",
  });

  const alerta = document.getElementById("alertaAccionPendiente");
  if (ok) {
    if (alerta) {
      alerta.innerHTML = `<div class="alert alert-success alert-dismissible fade show">${data.mensaje || "Representante aprobado exitosamente."}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    }
    cargarSolicitudesPendientes();
    cargarMetricas();
  } else {
    mostrarToast(data.mensaje || "No se pudo aprobar la solicitud", "error");
  }
};

window.rechazarRepresentante = async (id, nombre) => {
  const confirmado = await confirmarAccion(
    `¿Estás seguro de que deseas rechazar la solicitud de ${nombre}? No podrá publicar cursos.`,
    { titulo: "Rechazar solicitud", textoConfirmar: "Sí, rechazar" },
  );
  if (!confirmado) return;

  const { ok, data } = await apiFetch(`/admin/representantes/${id}/rechazar`, {
    method: "PUT",
  });

  const alerta = document.getElementById("alertaAccionPendiente");
  if (ok) {
    if (alerta) {
      alerta.innerHTML = `<div class="alert alert-warning alert-dismissible fade show">${data.mensaje || "Solicitud rechazada."}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    }
    cargarSolicitudesPendientes();
    cargarMetricas();
  } else {
    mostrarToast(data.mensaje || "No se pudo rechazar la solicitud", "error");
  }
};

// ============================================================
// 3. GESTIÓN DE USUARIOS
// ============================================================
async function cargarUsuarios(filtros = {}) {
  const tbody = document.getElementById("tablaUsuarios");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Cargando usuarios...</td></tr>`;

  const params = new URLSearchParams();
  if (filtros.q) params.append("q", filtros.q);
  if (filtros.rol) params.append("rol", filtros.rol);
  if (filtros.estado) params.append("estado", filtros.estado);

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const { ok, data } = await apiFetch(`/admin/usuarios${queryStr}`);

  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">${data.mensaje || "Error al cargar usuarios"}</td></tr>`;
    return;
  }

  const usuarios = data.usuarios || [];
  if (usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron usuarios con esos filtros.</td></tr>`;
    return;
  }

  const miSesion = obtenerSesion();

  tbody.innerHTML = usuarios
    .map((u) => {
      const badgeRol =
        u.rol === "administrador"
          ? "bg-danger"
          : u.rol === "representante"
            ? "bg-warning text-dark"
            : "bg-primary";

      const badgeEstado = u.activo
        ? '<span class="badge bg-success">Activo</span>'
        : '<span class="badge bg-secondary">Inactivo</span>';

      const estadoAprobacion =
        u.rol === "representante"
          ? u.estado_aprobacion === "pendiente"
            ? '<span class="badge bg-warning text-dark ms-1">Pendiente</span>'
            : u.estado_aprobacion === "rechazado"
              ? '<span class="badge bg-danger ms-1">Rechazado</span>'
              : '<span class="badge bg-success ms-1">Aprobado</span>'
          : "";

      const esPropiaCuenta = miSesion && miSesion.id === u.id;

      const botones = esPropiaCuenta
        ? '<span class="badge bg-info text-dark">Tu cuenta actual</span>'
        : `
          <button class="btn btn-sm ${u.activo ? "btn-outline-danger" : "btn-outline-success"} me-1" onclick="toggleEstadoUsuario(${u.id}, ${u.activo})">
            ${u.activo ? '<i class="bi bi-person-x"></i> Desactivar' : '<i class="bi bi-person-check"></i> Activar'}
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalCambiarRol(${u.id}, '${(u.nombre || u.email).replace(/'/g, "\\'")}', '${u.rol}')">
            <i class="bi bi-shield-shaded"></i> Rol
          </button>`;

      return `
        <tr>
          <td>${u.id}</td>
          <td>
            <div class="fw-semibold">${u.nombre || "Sin nombre"}</div>
          </td>
          <td>${u.dni || "-"}</td>
          <td><small>${u.email}</small></td>
          <td>
            <span class="badge ${badgeRol}">${u.rol}</span>
            ${estadoAprobacion}
          </td>
          <td>
            ${u.institucion ? `<small class="fw-semibold">${u.institucion}</small>` : '<span class="text-muted">-</span>'}
          </td>
          <td>${badgeEstado}</td>
          <td class="text-end">${botones}</td>
        </tr>`;
    })
    .join("");
}

window.toggleEstadoUsuario = async (id, estadoActual) => {
  const accion = estadoActual ? "desactivar" : "activar";
  const confirmado = await confirmarAccion(
    `¿Estás seguro de que deseas ${accion} esta cuenta de usuario?`,
    { titulo: `${accion === "activar" ? "Activar" : "Desactivar"} cuenta`, textoConfirmar: `Sí, ${accion}`, peligroso: accion === "desactivar" },
  );
  if (!confirmado) return;

  const { ok, data } = await apiFetch(`/admin/usuarios/${id}/estado`, {
    method: "PUT",
  });

  if (ok) {
    mostrarToast(`Cuenta ${accion === "activar" ? "activada" : "desactivada"} correctamente`, "exito");
    cargarUsuarios({
      q: document.getElementById("filtroBusquedaUsuario")?.value.trim(),
      rol: document.getElementById("filtroRolUsuario")?.value,
      estado: document.getElementById("filtroEstadoUsuario")?.value,
    });
  } else {
    mostrarToast(data.mensaje || "Error al actualizar estado", "error");
  }
};

window.abrirModalCambiarRol = (id, nombre, rolActual) => {
  document.getElementById("cambiarRolUsuarioId").value = id;
  document.getElementById("cambiarRolNombreUsuario").textContent = `Usuario: ${nombre}`;
  document.getElementById("selectNuevoRol").value = rolActual;
  modalCambiarRolInstance?.show();
};

async function confirmarCambioRol() {
  const id = document.getElementById("cambiarRolUsuarioId").value;
  const nuevoRol = document.getElementById("selectNuevoRol").value;

  const { ok, data } = await apiFetch(`/admin/usuarios/${id}/rol`, {
    method: "PUT",
    body: { nuevoRol },
  });

  if (ok) {
    modalCambiarRolInstance?.hide();
    mostrarToast("Rol actualizado correctamente", "exito");
    cargarUsuarios({
      q: document.getElementById("filtroBusquedaUsuario")?.value.trim(),
      rol: document.getElementById("filtroRolUsuario")?.value,
      estado: document.getElementById("filtroEstadoUsuario")?.value,
    });
    cargarMetricas();
  } else {
    mostrarToast(data.mensaje || "No se pudo cambiar el rol", "error");
  }
}

// ============================================================
// 4. GESTIÓN DE INSTITUCIONES
// ============================================================
async function cargarInstituciones() {
  const tbody = document.getElementById("tablaInstituciones");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Cargando instituciones...</td></tr>`;

  const { ok, data } = await apiFetch("/admin/instituciones");
  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">${data.mensaje || "Error al cargar instituciones"}</td></tr>`;
    return;
  }

  const instituciones = data.instituciones || [];
  if (instituciones.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay instituciones registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = instituciones
    .map((inst) => {
      const fecha = new Date(inst.created_at).toLocaleDateString("es-AR");
      const badgeEstado =
        inst.estado_aprobacion === "aprobado"
          ? '<span class="badge bg-success">Aprobada</span>'
          : inst.estado_aprobacion === "rechazado"
            ? '<span class="badge bg-danger">Rechazada</span>'
            : '<span class="badge bg-warning text-dark">Pendiente</span>';

      const reps = (inst.representantes || [])
        .map((r) => `<span class="badge bg-light text-dark border me-1">${r.nombre} (${r.cargo || "Representante"})</span>`)
        .join(" ") || '<span class="text-muted">Sin representante asignado</span>';

      return `
        <tr>
          <td>${inst.id}</td>
          <td><strong class="text-primary">${inst.nombre}</strong></td>
          <td><code>${inst.cuit || "No informado"}</code></td>
          <td>${badgeEstado}</td>
          <td>${reps}</td>
          <td><span class="badge bg-info text-dark fs-6">${inst.total_cursos}</span></td>
          <td><small class="text-muted">${fecha}</small></td>
        </tr>`;
    })
    .join("");
}

// ============================================================
// 5. CURSOS & MODERACIÓN
// ============================================================
async function cargarCursosAdmin() {
  const tbody = document.getElementById("tablaCursosAdmin");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Cargando cursos...</td></tr>`;

  const { ok, data } = await apiFetch("/admin/cursos");
  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">${data.mensaje || "Error al cargar cursos"}</td></tr>`;
    return;
  }

  const cursos = data.cursos || [];
  if (cursos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hay cursos publicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = cursos
    .map((c) => {
      const reportesBadge =
        c.reportes_pendientes > 0
          ? `<span class="badge bg-danger"><i class="bi bi-flag-fill me-1"></i>${c.reportes_pendientes} pendientes</span>`
          : '<span class="badge bg-light text-muted border">0</span>';

      return `
        <tr>
          <td>${c.id}</td>
          <td>
            <div class="fw-bold">${c.titulo}</div>
            <a href="detalles.html?id=${c.id}" target="_blank" class="small text-decoration-none">
              <i class="bi bi-box-arrow-up-right me-1"></i> Ver curso en plataforma
            </a>
          </td>
          <td>${c.institucion || "Sin institución"}</td>
          <td><span class="badge bg-secondary">${c.categoria || "-"}</span></td>
          <td>${c.modalidad}</td>
          <td>${c.cupo_maximo}</td>
          <td>${reportesBadge}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarCursoPorAdmin(${c.id}, '${c.titulo.replace(/'/g, "\\'")}')">
              <i class="bi bi-trash3 me-1"></i> Dar de baja
            </button>
          </td>
        </tr>`;
    })
    .join("");
}

window.eliminarCursoPorAdmin = async (id, titulo) => {
  const confirmado = await confirmarAccion(
    `¿Confirmás la eliminación del curso "${titulo}" por moderación? Se borrará de la plataforma permanentemente.`,
    { titulo: "Eliminar curso por moderación", textoConfirmar: "Sí, eliminar" },
  );
  if (!confirmado) return;

  const { ok, data } = await apiFetch(`/admin/cursos/${id}`, {
    method: "DELETE",
  });

  const alerta = document.getElementById("alertaAccionCurso");
  if (ok) {
    if (alerta) {
      alerta.innerHTML = `<div class="alert alert-success alert-dismissible fade show">${data.mensaje || "Curso eliminado"}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    }
    cargarCursosAdmin();
    cargarMetricas();
  } else {
    mostrarToast(data.mensaje || "No se pudo eliminar el curso", "error");
  }
};

// ============================================================
// 6. REPORTES DE LA COMUNIDAD
// ============================================================
async function cargarReportes(estadoFiltro = "pendiente") {
  const tbody = document.getElementById("tablaReportes");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Cargando reportes...</td></tr>`;

  const query = estadoFiltro ? `?estado=${estadoFiltro}` : "";
  const { ok, data } = await apiFetch(`/admin/reportes${query}`);

  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">${data.mensaje || "Error al cargar reportes"}</td></tr>`;
    return;
  }

  const reportes = data.reportes || [];
  if (reportes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-success"><i class="bi bi-check2-circle fs-4 d-block mb-1"></i> No hay reportes ${estadoFiltro || ""} registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = reportes
    .map((r) => {
      const fecha = new Date(r.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const badgeEstado =
        r.estado === "pendiente"
          ? '<span class="badge bg-warning text-dark">Pendiente</span>'
          : r.estado === "resuelto"
            ? '<span class="badge bg-success">Resuelto</span>'
            : '<span class="badge bg-secondary">Desestimado</span>';

      return `
        <tr>
          <td>
            <strong class="d-block">${r.curso_titulo}</strong>
            <a href="detalles.html?id=${r.curso_id}" target="_blank" class="small text-decoration-none">
              <i class="bi bi-link-45deg"></i> Ver página del curso
            </a>
          </td>
          <td>${r.institucion_nombre}</td>
          <td><span class="badge bg-danger-subtle text-danger border border-danger-subtle">${r.motivo}</span></td>
          <td><p class="small text-muted mb-0" style="max-width:280px;">${r.descripcion}</p></td>
          <td><small>${r.reportante}</small></td>
          <td><small class="text-muted">${fecha}</small></td>
          <td>${badgeEstado}</td>
          <td class="text-end">
            ${
              r.estado === "pendiente"
                ? `
                  <button class="btn btn-sm btn-success me-1" title="Marcar como resuelto" onclick="cambiarEstadoReporte(${r.id}, 'resuelto')">
                    <i class="bi bi-check2"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary me-1" title="Desestimar denuncia" onclick="cambiarEstadoReporte(${r.id}, 'desestimado')">
                    <i class="bi bi-slash-circle"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" title="Dar de baja curso" onclick="eliminarCursoPorAdmin(${r.curso_id}, '${r.curso_titulo.replace(/'/g, "\\'")}')">
                    <i class="bi bi-trash3"></i>
                  </button>
                `
                : '<span class="text-muted small">Cerrado</span>'
            }
          </td>
        </tr>`;
    })
    .join("");
}

window.cambiarEstadoReporte = async (id, estado) => {
  const { ok, data } = await apiFetch(`/admin/reportes/${id}`, {
    method: "PUT",
    body: { estado },
  });

  if (ok) {
    const btnActivo = document.getElementById("filtroReportePendiente")?.classList.contains("active");
    mostrarToast("Reporte actualizado", "exito");
    cargarReportes(btnActivo ? "pendiente" : "");
    cargarMetricas();
  } else {
    mostrarToast(data.mensaje || "Error al actualizar el reporte", "error");
  }
};
