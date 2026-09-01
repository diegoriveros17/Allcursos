document.addEventListener("DOMContentLoaded", async () => {
  const sesion = obtenerSesion();
  if (!sesion || sesion.rol !== "representante") {
    window.location.href = "index.html";
    return;
  }

  const parametrosURL = new URLSearchParams(window.location.search);
  const cursoId = parametrosURL.get("id");

  if (!cursoId) {
    window.location.href = "dashboard.html";
    return;
  }

  const tablaBody = document.getElementById("tablaAlumnosInscritos");
  const { ok, data } = await apiFetch(`/cursos/${cursoId}/alumnos`);

  if (!ok) {
    document.getElementById("nombreCursoTitulo").innerText = "No se pudo cargar el curso";
    tablaBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${data.mensaje || "Error al cargar los alumnos"}</td></tr>`;
    return;
  }

  document.getElementById("nombreCursoTitulo").innerText =
    `Gestión de Alumnos: ${data.curso.titulo}`;

  const inscripciones = data.inscripciones || [];

  if (inscripciones.length === 0) {
    tablaBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay alumnos registrados en este curso todavía.</td></tr>`;
    return;
  }

  // Guardamos en memoria los datos para poder mostrarlos en el modal sin otra petición
  window.__alumnosPorInscripcion = {};

  tablaBody.innerHTML = "";
  inscripciones.forEach((ins, index) => {
    const persona = ins.usuario?.persona;
    if (!persona) return;

    window.__alumnosPorInscripcion[ins.id] = {
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      telefono: persona.telefono,
      dni_verificado: persona.dni_verificado,
      contacto_verificado: ins.contacto_verificado,
      email: ins.usuario.email_login,
      estado: ins.estado,
    };

    const badgeClase =
      ins.estado === "Finalizado"
        ? "bg-success"
        : ins.estado === "Cancelado"
          ? "bg-secondary"
          : ins.estado === "En espera"
            ? "bg-warning text-dark"
            : "bg-primary";

    const badgeDni =
      persona.dni_verificado === "Verificado"
        ? `<span class="badge bg-success" title="El DNI fue verificado contra un padrón externo"><i class="bi bi-patch-check-fill"></i></span>`
        : persona.dni_verificado === "No_verificado"
          ? `<span class="badge bg-danger" title="El DNI no pudo confirmarse en el padrón consultado"><i class="bi bi-exclamation-triangle-fill"></i></span>`
          : `<span class="badge bg-secondary" title="Todavía no hay un servicio de verificación de DNI conectado"><i class="bi bi-question-circle"></i></span>`;

    const badgeContacto = ins.contacto_verificado
      ? `<span class="badge bg-success" title="Confirmó un código enviado a su email/teléfono"><i class="bi bi-shield-check"></i> Verificado</span>`
      : `<span class="badge bg-light text-dark border" title="Se inscribió con una cuenta ya existente, sin verificación adicional">Sin verificar</span>`;

    tablaBody.innerHTML += `
        <tr>
          <td class="fw-bold">${index + 1}</td>
          <td>${persona.nombre} ${persona.apellido}</td>
          <td>${persona.dni} ${badgeDni}</td>
          <td>${badgeContacto}</td>
          <td><span class="badge ${badgeClase}">${ins.estado}</span></td>
          <td class="text-center">
            <div class="btn-group">
              <button class="btn btn-sm btn-primary" onclick="mostrarModalContacto(${ins.id})">
                <i class="bi bi-telephone-outbound-fill"></i> Ver Contacto
              </button>
              ${
                ins.estado !== "Finalizado" && ins.estado !== "Cancelado"
                  ? `<button class="btn btn-sm btn-outline-success" onclick="marcarFinalizado(${ins.id})">
                       <i class="bi bi-check-circle"></i> Finalizar
                     </button>`
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
  });
});

function mostrarModalContacto(inscripcionId) {
  const alumno = window.__alumnosPorInscripcion?.[inscripcionId];
  if (!alumno) return;

  const contenedorModal = document.getElementById("cuerpoModalContacto");
  contenedorModal.innerHTML = `
    <div class="text-center mb-3">
      <div class="display-5 text-primary"><i class="bi bi-person-badge"></i></div>
      <h4 class="fw-bold mt-1">${alumno.nombre} ${alumno.apellido}</h4>
      <span class="badge bg-secondary">DNI: ${alumno.dni}</span>
    </div>
    <ul class="list-group list-group-flush">
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span><i class="bi bi-envelope-fill text-muted me-2"></i>Email</span>
        <a href="mailto:${alumno.email}" class="text-decoration-none fw-semibold">${alumno.email}</a>
      </li>
      ${
        alumno.telefono
          ? `<li class="list-group-item d-flex justify-content-between align-items-center">
               <span><i class="bi bi-telephone-fill text-muted me-2"></i>Teléfono</span>
               <a href="tel:${alumno.telefono}" class="text-decoration-none fw-semibold">${alumno.telefono}</a>
             </li>`
          : ""
      }
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span><i class="bi bi-info-circle-fill text-muted me-2"></i>Condición</span>
        <span class="fw-semibold">${alumno.estado}</span>
      </li>
    </ul>
    <div class="alert alert-info mt-3 mb-0 small text-center" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-1"></i> Utilice estas vías exclusivamente para coordinar vacantes.
    </div>
  `;

  const modalElement = document.getElementById("modalContactoAlumno");
  const modalBootstrap = new bootstrap.Modal(modalElement);
  modalBootstrap.show();
}

async function marcarFinalizado(inscripcionId) {
  if (!confirm("¿Marcar a este alumno como Finalizado? Podrá descargar su certificado.")) return;
  const { ok, data } = await apiFetch(`/inscripciones/${inscripcionId}`, {
    method: "PUT",
    body: { estado: "Finalizado" },
  });
  if (ok) {
    window.location.reload();
  } else {
    alert(data.mensaje || "No se pudo actualizar el estado");
  }
}
