document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const idCurso = urlParams.get("id");
  const contenedor = document.getElementById("contenedorDetalle");

  if (!idCurso) {
    contenedor.innerHTML = mensajeNoEncontrado();
    return;
  }

  const { ok, data } = await apiFetch(`/cursos/${idCurso}`, { auth: false });

  if (!ok || !data.curso) {
    contenedor.innerHTML = mensajeNoEncontrado();
    return;
  }

  const curso = data.curso;
  const sesion = obtenerSesion();
  const sinCupos = curso.cupos_disponibles === 0;

  contenedor.innerHTML = `
      <div class="card shadow-lg border-0 overflow-hidden">
        <div class="row g-0">
          <div class="col-md-5">
            <img src="assets/img/curso_programacion.webp" class="img-fluid h-100 w-100" style="object-fit: cover; min-height: 300px;" alt="${curso.titulo}">
          </div>

          <div class="col-md-7 p-4 p-md-5 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-primary fs-6">${curso.categoria?.nombre || "General"}</span>
                <span class="badge bg-dark fs-6">${curso.modalidad}</span>
              </div>

              <h1 class="display-6 fw-bold text-dark mb-3">${curso.titulo}</h1>
              <p class="text-muted mb-2"><strong>Dictado por:</strong> ${curso.institucion?.nombre || "Institución"}</p>
              <p class="fs-5 text-secondary mb-4">${curso.descripcion}</p>

              <h5 class="fw-bold mb-2">Información de Cursada:</h5>
              ${
                curso.direccion_dictado
                  ? `<p class="mb-1"><strong>📍 Lugar:</strong> ${curso.direccion_dictado.calle} ${curso.direccion_dictado.numero || ""}, ${curso.direccion_dictado.ciudad}</p>`
                  : ""
              }
              ${curso.duracion_horas ? `<p class="mb-1"><strong>⏱️ Duración:</strong> ${curso.duracion_horas} horas</p>` : ""}
              <p class="mb-1"><strong>👥 Cupos Disponibles:</strong> ${curso.cupos_disponibles} de ${curso.cupo_maximo}</p>
            </div>

            <div class="mt-4">
              <button class="btn btn-dark btn-lg w-100" id="btnInscribirse" ${sinCupos ? "" : ""}>
                ${sinCupos ? "Anotarme en lista de espera" : "Inscribirme a este Curso"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL DE CONFIRMACIÓN (PARA USUARIOS LOGUEADOS) -->
      <div class="modal fade" id="modalChoice" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content rounded-3 shadow">
            <div class="modal-body p-4">
              <h5 class="mb-2 fw-bold" id="modalChoiceNombre"></h5>
              <p class="mb-0 text-secondary">¿Deseas confirmar tu inscripción al curso <strong class="text-dark">"${curso.titulo}"</strong>?</p>
              <div id="modalChoiceError" class="text-danger small mt-2"></div>
            </div>
            <div class="modal-footer flex-nowrap p-0">
              <button type="button" class="btn btn-lg btn-link fs-6 text-decoration-none col-6 py-3 m-0 rounded-0 border-end fw-bold text-success" id="btnConfirmarLogueado">Sí, inscribirme</button>
              <button type="button" class="btn btn-lg btn-link fs-6 text-decoration-none col-6 py-3 m-0 rounded-0 text-secondary" data-bs-dismiss="modal">Cancelar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL FORMULARIO DE INSCRIPCIÓN (PARA USUARIOS NO LOGUEADOS) -->
      <div class="modal fade" id="modalInscripcion" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title">Formulario de Inscripción - ${curso.titulo}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-start">
              <p class="text-muted mb-1">Ingresa tus datos para completar tu inscripción sin necesidad de registrarte antes:</p>
              <p class="text-muted small mb-3">Con estos datos crearemos tu cuenta automáticamente para que luego puedas ver tus cursos e ingresar con tu email.</p>
              <div id="msjInscripcionGuest" class="mb-2"></div>
              <form id="formInscripcion">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="insNombre" class="form-label fw-semibold">Nombre</label>
                    <input type="text" class="form-control" id="insNombre" required>
                  </div>
                  <div class="col-md-6">
                    <label for="insApellido" class="form-label fw-semibold">Apellido</label>
                    <input type="text" class="form-control" id="insApellido" required>
                  </div>
                  <div class="col-md-6">
                    <label for="insDni" class="form-label fw-semibold">DNI / Documento</label>
                    <input type="text" class="form-control" id="insDni" required>
                  </div>
                  <div class="col-md-6">
                    <label for="insCorreo" class="form-label fw-semibold">Correo Electrónico</label>
                    <input type="email" class="form-control" id="insCorreo" required>
                  </div>
                  <div class="col-md-12">
                    <label for="insPassword" class="form-label fw-semibold">Elegí una contraseña (opcional)</label>
                    <input type="password" class="form-control" id="insPassword" placeholder="Si la dejás en blanco, usaremos tu DNI como contraseña provisoria">
                  </div>
                </div>
                <div class="mt-4 d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="submit" class="btn btn-success">Confirmar Inscripción</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

  const modalChoiceBS = new bootstrap.Modal(document.getElementById("modalChoice"));
  const modalInscripcionBS = new bootstrap.Modal(document.getElementById("modalInscripcion"));

  document.getElementById("btnInscribirse").addEventListener("click", () => {
    if (sesion) {
      document.getElementById("modalChoiceNombre").textContent = `👋 ¡Hola ${sesion.nombre}!`;
      modalChoiceBS.show();
    } else {
      modalInscripcionBS.show();
    }
  });

  document.getElementById("btnConfirmarLogueado").addEventListener("click", async () => {
    const { ok, data: resp } = await apiFetch("/inscripciones", {
      method: "POST",
      body: { curso_id: curso.id },
    });
    if (ok) {
      modalChoiceBS.hide();
      alert(resp.mensaje);
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("modalChoiceError").textContent =
        resp.mensaje || (resp.errores ? resp.errores.join(", ") : "No se pudo completar la inscripción");
    }
  });

  document.getElementById("formInscripcion").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cuerpo = {
      curso_id: curso.id,
      nombre: document.getElementById("insNombre").value.trim(),
      apellido: document.getElementById("insApellido").value.trim(),
      dni: document.getElementById("insDni").value.trim(),
      email: document.getElementById("insCorreo").value.trim(),
      password: document.getElementById("insPassword").value,
    };

    const { ok, data: resp } = await apiFetch("/inscripciones", {
      method: "POST",
      auth: false,
      body: cuerpo,
    });

    const msj = document.getElementById("msjInscripcionGuest");
    if (ok) {
      modalInscripcionBS.hide();
      alert(
        `${resp.mensaje}${resp.aviso ? "\n\n" + resp.aviso : ""}`,
      );
      document.getElementById("formInscripcion").reset();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2 mb-0">${
        resp.mensaje || (resp.errores ? resp.errores.join(", ") : "No se pudo completar la inscripción")
      }</div>`;
    }
  });
});

function mensajeNoEncontrado() {
  return `
      <div class="alert alert-danger text-center shadow-sm" role="alert">
        <h4 class="alert-heading">¡Curso no encontrado!</h4>
        <p>El curso que estás intentando buscar no existe o no está disponible en este momento.</p>
        <hr>
        <a href="index.html" class="btn btn-outline-danger">Volver al Inicio</a>
      </div>
    `;
}
