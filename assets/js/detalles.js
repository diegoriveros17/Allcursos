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
  window.__cursoIdActual = curso.id;
  const sesion = obtenerSesion();
  const sinCupos = curso.cupos_disponibles === 0;

  contenedor.innerHTML = `
      <div class="card shadow-lg border-0 overflow-hidden">
        <div class="row g-0">
          <div class="col-md-5">
            <img src="${curso.imagen_url || "assets/img/curso_programacion.webp"}" class="img-fluid h-100 w-100" style="object-fit: cover; min-height: 300px;" alt="${curso.titulo}">
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
              ${
                curso.requisitos && curso.requisitos.length > 0
                  ? `<h6 class="fw-bold mt-3 mb-1">Requisitos:</h6>
                     <ul class="mb-0">
                       ${curso.requisitos
                         .map(
                           (r) =>
                             `<li>${r.descripcion}${r.cursos_requisitos?.es_obligatorio === false ? " <span class=\"text-muted\">(opcional)</span>" : ""}</li>`,
                         )
                         .join("")}
                     </ul>`
                  : ""
              }
            </div>

            <div class="d-flex align-items-center justify-content-between border-top border-bottom py-3 my-3">
              <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" id="btnLikeCurso">
                <i class="bi bi-hand-thumbs-up" id="iconoLike"></i>
                <span id="contadorLikes">${curso.likes_count || 0}</span>
                <span class="d-none d-sm-inline">Me gusta</span>
              </button>

              <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  <i class="bi bi-share me-1"></i>Compartir
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                  <li><button class="dropdown-item" id="btnCompartirNativo"><i class="bi bi-phone me-2"></i>Compartir...</button></li>
                  <li><a class="dropdown-item" id="linkCompartirWhatsapp" href="#" target="_blank"><i class="bi bi-whatsapp me-2"></i>WhatsApp</a></li>
                  <li><a class="dropdown-item" id="linkCompartirFacebook" href="#" target="_blank"><i class="bi bi-facebook me-2"></i>Facebook</a></li>
                  <li><a class="dropdown-item" id="linkCompartirX" href="#" target="_blank"><i class="bi bi-twitter-x me-2"></i>X / Twitter</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item" id="btnCopiarLink"><i class="bi bi-link-45deg me-2"></i>Copiar link</button></li>
                  <li><button class="dropdown-item" data-bs-toggle="modal" data-bs-target="#modalRecomendar"><i class="bi bi-envelope me-2"></i>Recomendar por email</button></li>
                </ul>
              </div>
            </div>

            <div class="mt-4">
              ${
                sesion && sesion.rol !== "ciudadano"
                  ? `<div class="alert alert-secondary text-center mb-0">
                       Los representantes de instituciones no pueden inscribirse a cursos.
                     </div>`
                  : `<button class="btn btn-dark btn-lg w-100" id="btnInscribirse">
                       ${sinCupos ? "Anotarme en lista de espera" : "Inscribirme a este Curso"}
                     </button>`
              }
            </div>

            <div class="mt-3 text-center">
              <button class="btn btn-sm btn-link text-muted text-decoration-none" data-bs-toggle="modal" data-bs-target="#modalReportarCurso">
                <i class="bi bi-flag me-1 text-danger"></i> Reportar este curso
              </button>
            </div>

            <!-- MODAL RECOMENDAR POR EMAIL -->
            <div class="modal fade" id="modalRecomendar" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Recomendar este curso</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body text-start">
                    <div id="msjRecomendar" class="mb-2"></div>
                    <form id="formRecomendar">
                      <div class="mb-3">
                        <label class="form-label small fw-semibold">Tu nombre (opcional)</label>
                        <input type="text" class="form-control" id="recomendarNombre" placeholder="Ej: María">
                      </div>
                      <div class="mb-3">
                        <label class="form-label small fw-semibold">Email de tu amigo/a</label>
                        <input type="email" class="form-control" id="recomendarEmail" required placeholder="nombre@ejemplo.com">
                      </div>
                      <div class="mb-3">
                        <label class="form-label small fw-semibold">Mensaje (opcional)</label>
                        <textarea class="form-control" id="recomendarMensaje" rows="2" placeholder="Che, mirá este curso..."></textarea>
                      </div>
                      <button type="submit" class="btn btn-dark w-100">Enviar recomendación</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${
        curso.mapa_embed_url || curso.latitud != null // NUEVO: si la institución cargó ubicación (pin o Google Maps)...
          ? `
      <div class="card shadow-sm border-0 mt-4 text-start"> <!-- Tarjeta del mapa -->
        <div class="card-body p-4"> <!-- Cuerpo de la tarjeta -->
          <h4 class="fw-bold mb-3"><i class="bi bi-geo-alt-fill me-2"></i>Dónde queda ${curso.institucion?.nombre || "la institución"}</h4> <!-- Título con el nombre de la institución -->
          <div id="contenedorMapa"></div> <!-- Acá se dibuja el mapa con pin o el iframe de Google Maps -->
          ${curso.latitud != null ? `<a class="btn btn-outline-primary btn-sm mt-3" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${curso.latitud},${curso.longitud}"><i class="bi bi-signpost-2 me-1"></i>Cómo llegar</a>` : ""} <!-- Botón que abre Google Maps con la ruta hasta el pin -->
        </div> <!-- Cierra el cuerpo -->
      </div>` // Cierra la tarjeta
          : "" // ...si no hay ubicación no se muestra nada
      }

      ${
        !sesion || sesion.rol === "ciudadano"
          ? `
      <!-- CONSULTAR SOBRE ESTE CURSO (público, no requiere cuenta) -->
      <div class="card shadow-sm border-0 mt-4 text-start" id="seccionConsulta">
        <div class="card-body p-4">
          <h4 class="fw-bold mb-1"><i class="bi bi-chat-dots me-2"></i>Consultar sobre este curso</h4>
          <p class="text-muted">¿Tenés dudas? Escribile a la institución. No necesitás tener una cuenta.</p>
          <div id="msjConsulta"></div>
          <form id="formConsulta" novalidate>
            <div class="row g-3">
              <div class="col-md-6">
                <label for="consultaNombre" class="form-label fw-semibold">Nombre</label>
                <input type="text" class="form-control" id="consultaNombre" maxlength="100" autocomplete="name" required>
              </div>
              <div class="col-md-6">
                <label for="consultaEmail" class="form-label fw-semibold">Correo de contacto</label>
                <input type="email" class="form-control" id="consultaEmail" maxlength="150" autocomplete="email" required>
              </div>
              <div class="col-12">
                <label for="consultaMensaje" class="form-label fw-semibold">Mensaje / Consulta</label>
                <textarea class="form-control" id="consultaMensaje" rows="4" minlength="10" maxlength="2000" required></textarea>
                <div class="form-text text-end"><span id="consultaContador">0</span>/2000</div>
              </div>
              <!-- Campo trampa para bots: una persona no lo ve ni lo completa -->
              <div style="position:absolute;left:-9999px;" aria-hidden="true">
                <label>No completar este campo <input type="text" id="consultaSitioWeb" tabindex="-1" autocomplete="off"></label>
              </div>
              <div class="col-12 text-end">
                <button type="submit" class="btn btn-dark" id="btnEnviarConsulta"><i class="bi bi-send me-1"></i>Enviar consulta</button>
              </div>
            </div>
          </form>
        </div>
      </div>`
          : ""
      }

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
                  <div class="col-md-6">
                    <label for="insTelefono" class="form-label fw-semibold">Teléfono (opcional)</label>
                    <input type="tel" class="form-control" id="insTelefono" placeholder="+54 9 370...">
                  </div>
                  <div class="col-md-12">
                    <label for="insPassword" class="form-label fw-semibold">Elegí una contraseña (opcional)</label>
                    <input type="password" class="form-control" id="insPassword" placeholder="Si la dejás en blanco, usaremos tu DNI como contraseña provisoria">
                  </div>
                </div>

                <hr class="my-3">
                <div class="border rounded p-3 bg-light">
                  <p class="fw-semibold mb-2">
                    <i class="bi bi-shield-check me-1"></i>Verificación de identidad
                  </p>
                  <p class="text-muted small mb-2">
                    Para evitar inscripciones con datos falsos, necesitamos verificar tu contacto con un código.
                  </p>
                  <div class="row g-2 align-items-end">
                    <div class="col-auto">
                      <label class="form-label small mb-1 d-block">Verificar por</label>
                      <select class="form-select form-select-sm" id="insMedioVerificacion">
                        <option value="Email">Email</option>
                        <option value="Telefono">Teléfono (SMS)</option>
                      </select>
                    </div>
                    <div class="col-auto">
                      <button type="button" class="btn btn-sm btn-outline-primary" id="btnEnviarCodigo">
                        Enviar código
                      </button>
                    </div>
                  </div>
                  <div id="bloqueCodigoVerificacion" class="d-none mt-3">
                    <div class="row g-2 align-items-end">
                      <div class="col-auto">
                        <label for="insCodigoVerificacion" class="form-label small mb-1 d-block">Código recibido</label>
                        <input type="text" class="form-control form-control-sm" id="insCodigoVerificacion" maxlength="6" style="width: 120px;">
                      </div>
                      <div class="col-auto">
                        <button type="button" class="btn btn-sm btn-outline-success" id="btnConfirmarCodigo">
                          Confirmar código
                        </button>
                      </div>
                    </div>
                  </div>
                  <div id="msjVerificacionContacto" class="small mt-2"></div>
                </div>

                <div class="mt-4 d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="submit" class="btn btn-success" id="btnConfirmarInscripcionGuest" disabled>
                    Confirmar Inscripción
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

  const modalChoiceBS = new bootstrap.Modal(document.getElementById("modalChoice"));
  const modalInscripcionBS = new bootstrap.Modal(document.getElementById("modalInscripcion"));

  const botonInscribirse = document.getElementById("btnInscribirse");
  if (botonInscribirse) {
    botonInscribirse.addEventListener("click", () => {
      if (sesion) {
        document.getElementById("modalChoiceNombre").textContent = `👋 ¡Hola ${sesion.nombre}!`;
        modalChoiceBS.show();
      } else {
        modalInscripcionBS.show();
      }
    });
  }

  inicializarAccionesSociales(curso);
  if (curso.latitud != null) mostrarMapaPin("contenedorMapa", curso.latitud, curso.longitud, curso.institucion?.nombre); // NUEVO: si hay pin, dibuja el mapa Leaflet con el pin (tiene prioridad)
  else if (curso.mapa_embed_url) mostrarMapa("contenedorMapa", curso.mapa_embed_url); // NUEVO: si no hay pin pero sí código de Google, dibuja el iframe

  document.getElementById("btnConfirmarLogueado").addEventListener("click", async () => {
    const { ok, data: resp } = await apiFetch("/inscripciones", {
      method: "POST",
      body: { curso_id: curso.id },
    });
    if (ok) {
      modalChoiceBS.hide();
      mostrarToast(resp.mensaje, "exito");
      setTimeout(() => (window.location.href = "dashboard.html"), 1200);
    } else {
      document.getElementById("modalChoiceError").textContent =
        resp.mensaje || (resp.errores ? resp.errores.join(", ") : "No se pudo completar la inscripción");
    }
  });

  let verificacionActual = null; // { id, medio, valor }

  const selectMedio = document.getElementById("insMedioVerificacion");
  const btnEnviarCodigo = document.getElementById("btnEnviarCodigo");
  const bloqueCodigoVerificacion = document.getElementById("bloqueCodigoVerificacion");
  const btnConfirmarCodigo = document.getElementById("btnConfirmarCodigo");
  const btnConfirmarInscripcionGuest = document.getElementById("btnConfirmarInscripcionGuest");
  const msjVerificacion = document.getElementById("msjVerificacionContacto");

  btnEnviarCodigo.addEventListener("click", async () => {
    const medio = selectMedio.value;
    const valor =
      medio === "Email"
        ? document.getElementById("insCorreo").value.trim()
        : document.getElementById("insTelefono").value.trim();

    if (!valor) {
      msjVerificacion.innerHTML = `<span class="text-danger">Completá primero ${medio === "Email" ? "tu email" : "tu teléfono"}.</span>`;
      return;
    }

    btnEnviarCodigo.disabled = true;
    btnEnviarCodigo.textContent = "Enviando...";

    const { ok, data } = await apiFetch("/verificaciones/solicitar", {
      method: "POST",
      auth: false,
      body: { medio, valor },
    });

    btnEnviarCodigo.disabled = false;
    btnEnviarCodigo.textContent = "Enviar código";

    if (ok) {
      verificacionActual = { id: data.verificacion_id, medio, valor, confirmado: false };
      bloqueCodigoVerificacion.classList.remove("d-none");
      msjVerificacion.innerHTML = `<span class="text-success">${data.mensaje}</span>`;
    } else {
      msjVerificacion.innerHTML = `<span class="text-danger">${data.mensaje || "No se pudo enviar el código"}</span>`;
    }
  });

  btnConfirmarCodigo.addEventListener("click", async () => {
    if (!verificacionActual) return;
    const codigo = document.getElementById("insCodigoVerificacion").value.trim();
    if (!codigo) return;

    const { ok, data } = await apiFetch("/verificaciones/confirmar", {
      method: "POST",
      auth: false,
      body: { verificacion_id: verificacionActual.id, codigo },
    });

    if (ok) {
      verificacionActual.confirmado = true;
      msjVerificacion.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${data.mensaje}</span>`;
      btnConfirmarInscripcionGuest.disabled = false;
      selectMedio.disabled = true;
      btnEnviarCodigo.disabled = true;
      document.getElementById("insCodigoVerificacion").disabled = true;
      btnConfirmarCodigo.disabled = true;
    } else {
      msjVerificacion.innerHTML = `<span class="text-danger">${data.mensaje || "Código incorrecto"}</span>`;
    }
  });

  document.getElementById("formInscripcion").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!verificacionActual || !verificacionActual.confirmado) {
      msjVerificacion.innerHTML = `<span class="text-danger">Tenés que verificar tu contacto antes de inscribirte.</span>`;
      return;
    }

    const cuerpo = {
      curso_id: curso.id,
      nombre: document.getElementById("insNombre").value.trim(),
      apellido: document.getElementById("insApellido").value.trim(),
      dni: document.getElementById("insDni").value.trim(),
      email: document.getElementById("insCorreo").value.trim(),
      telefono: document.getElementById("insTelefono").value.trim(),
      password: document.getElementById("insPassword").value,
      verificacion_id: verificacionActual.id,
      medio_verificacion: verificacionActual.medio,
    };

    const { ok, data: resp } = await apiFetch("/inscripciones", {
      method: "POST",
      auth: false,
      body: cuerpo,
    });

    const msj = document.getElementById("msjInscripcionGuest");
    if (ok) {
      modalInscripcionBS.hide();
      mostrarToast(
        `${resp.mensaje}${resp.aviso ? "<br><small>" + resp.aviso + "</small>" : ""}`,
        "exito",
      );
      document.getElementById("formInscripcion").reset();
      verificacionActual = null;
      btnConfirmarInscripcionGuest.disabled = true;
      bloqueCodigoVerificacion.classList.add("d-none");
      selectMedio.disabled = false;
      btnEnviarCodigo.disabled = false;
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2 mb-0">${
        resp.mensaje || (resp.errores ? resp.errores.join(", ") : "No se pudo completar la inscripción")
      }</div>`;
    }
  });

  // Manejador para enviar reporte de curso
  const formReporte = document.getElementById("formReportarCurso");
  const msjReporte = document.getElementById("msjReporte");
  const modalReporteEl = document.getElementById("modalReportarCurso");
  let modalReporteBS = null;
  if (modalReporteEl) {
    modalReporteBS = new bootstrap.Modal(modalReporteEl);
  }

  // Pre-llenar email si está logueado
  if (sesion && sesion.email_login) {
    const inputEmail = document.getElementById("reporteEmail");
    if (inputEmail) {
      inputEmail.value = sesion.email_login;
      inputEmail.disabled = true;
    }
  }

  if (formReporte) {
    formReporte.addEventListener("submit", async (e) => {
      e.preventDefault();

      const motivo = document.getElementById("reporteMotivo")?.value;
      const descripcion = document.getElementById("reporteDescripcion")?.value.trim();
      const email_contacto = document.getElementById("reporteEmail")?.value.trim();

      const btnSubmit = document.getElementById("btnEnviarReporte");
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Enviando...`;
      }

      const { ok, data } = await apiFetch(`/cursos/${cursoId}/reportar`, {
        method: "POST",
        body: { motivo, descripcion, email_contacto },
      });

      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `Enviar Reporte`;
      }

      if (ok) {
        msjReporte.innerHTML = `<div class="alert alert-success">${data.mensaje || "Reporte enviado con éxito."}</div>`;
        formReporte.reset();
        setTimeout(() => {
          modalReporteBS?.hide();
          msjReporte.innerHTML = "";
        }, 2200);
      } else {
        msjReporte.innerHTML = `<div class="alert alert-danger">${data.mensaje || "Error al enviar reporte"}</div>`;
      }
    });
  }
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

// ============================================================
// ME GUSTA + COMPARTIR + RECOMENDAR
// ============================================================
// URL pública con la que se arman los links para compartir. La define el servidor
// (APP_URL / HOST_IP en el .env); si no hay nada configurado se usa la dirección actual.
async function obtenerUrlBasePublica() {
  try {
    const { ok, data } = await apiFetch("/config/publica", { auth: false });
    if (ok && data.baseUrl) return data.baseUrl.replace(/\/+$/, "");
  } catch {
    // sin conexión con la config: seguimos con el origen actual
  }
  return window.location.origin;
}

async function inicializarAccionesSociales(curso) {
  const urlCurso = `${await obtenerUrlBasePublica()}/detalles.html?id=${curso.id}`;
  const textoCompartir = `Mirá este curso: "${curso.titulo}" en AllCursos`;

  // --- Me gusta: el contador es público, pero votar requiere cuenta ---
  const btnLike = document.getElementById("btnLikeCurso");
  const iconoLike = document.getElementById("iconoLike");
  const contadorLikes = document.getElementById("contadorLikes");
  let yaLikeado = !!curso.yaMeGusta;
  const sesionActual = obtenerSesion();

  const pintarEstadoLike = () => {
    iconoLike.className = yaLikeado ? "bi bi-hand-thumbs-up-fill" : "bi bi-hand-thumbs-up";
    btnLike.classList.toggle("btn-outline-secondary", !yaLikeado);
    btnLike.classList.toggle("btn-dark", yaLikeado);
  };
  pintarEstadoLike();

  btnLike?.addEventListener("click", async () => {
    if (!sesionActual) {
      mostrarToast("Necesitás iniciar sesión para dar me gusta", "advertencia");
      return;
    }
    if (sesionActual.rol !== "ciudadano") {
      mostrarToast("Sólo los ciudadanos pueden dar me gusta a los cursos", "advertencia");
      return;
    }

    btnLike.disabled = true;
    const metodo = yaLikeado ? "DELETE" : "POST";
    const { ok, data } = await apiFetch(`/cursos/${curso.id}/like`, { method: metodo });
    if (ok) {
      contadorLikes.textContent = data.likes_count;
      yaLikeado = data.yaMeGusta;
      pintarEstadoLike();
    } else if (data.likes_count !== undefined) {
      // ej: ya lo había likeado desde otra pestaña/dispositivo
      contadorLikes.textContent = data.likes_count;
      yaLikeado = !!data.yaMeGusta;
      pintarEstadoLike();
    } else {
      mostrarToast(data.mensaje || "No se pudo registrar el me gusta", "error");
    }
    btnLike.disabled = false;
  });

  // --- Compartir ---
  const linkWhatsapp = document.getElementById("linkCompartirWhatsapp");
  const linkFacebook = document.getElementById("linkCompartirFacebook");
  const linkX = document.getElementById("linkCompartirX");
  if (linkWhatsapp) linkWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(textoCompartir + " " + urlCurso)}`;
  if (linkFacebook) linkFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlCurso)}`;
  if (linkX) linkX.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartir)}&url=${encodeURIComponent(urlCurso)}`;

  // Web Share API: en celulares abre el selector nativo del sistema
  // (ahí aparece Instagram, WhatsApp, Telegram, Mail, etc. si están
  // instalados). Si el navegador no la soporta, hacemos fallback a copiar.
  const btnCompartirNativo = document.getElementById("btnCompartirNativo");
  btnCompartirNativo?.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: curso.titulo, text: textoCompartir, url: urlCurso });
      } catch (error) {
        /* el usuario canceló el selector, no hacemos nada */
      }
    } else {
      copiarAlPortapapeles(urlCurso);
    }
  });

  const btnCopiarLink = document.getElementById("btnCopiarLink");
  btnCopiarLink?.addEventListener("click", () => copiarAlPortapapeles(urlCurso));

  function copiarAlPortapapeles(texto) {
    navigator.clipboard
      .writeText(texto)
      .then(() => mostrarToast("¡Link copiado al portapapeles!", "exito"))
      .catch(() => mostrarToast("No se pudo copiar el link. Copialo manualmente: " + texto, "error"));
  }

  // --- Recomendar por email ---
  const formRecomendar = document.getElementById("formRecomendar");
  formRecomendar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cuerpo = {
      email_destino: document.getElementById("recomendarEmail").value.trim(),
      nombre_remitente: document.getElementById("recomendarNombre").value.trim(),
      mensaje_personal: document.getElementById("recomendarMensaje").value.trim(),
    };
    const { ok, data } = await apiFetch(`/cursos/${curso.id}/recomendar`, {
      method: "POST",
      auth: false,
      body: cuerpo,
    });
    const msj = document.getElementById("msjRecomendar");
    if (ok) {
      msj.innerHTML = `<div class="alert alert-success py-2 mb-0">${data.mensaje}</div>`;
      formRecomendar.reset();
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById("modalRecomendar"))?.hide();
        msj.innerHTML = "";
      }, 1800);
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2 mb-0">${data.mensaje || "No se pudo enviar la recomendación"}</div>`;
    }
  });

  inicializarFormularioConsulta(curso);
}

// ============================================================
// CONSULTAR SOBRE EL CURSO (usuarios no registrados)
// ============================================================
function inicializarFormularioConsulta(curso) {
  const form = document.getElementById("formConsulta");
  if (!form) return;

  const msj = document.getElementById("msjConsulta");
  const campoMensaje = document.getElementById("consultaMensaje");
  const contador = document.getElementById("consultaContador");
  const boton = document.getElementById("btnEnviarConsulta");

  // Si ya inició sesión, le ahorramos tipear sus datos
  const sesion = obtenerSesion();
  if (sesion) {
    document.getElementById("consultaNombre").value = [sesion.nombre, sesion.apellido].filter(Boolean).join(" ");
    document.getElementById("consultaEmail").value = sesion.email_login || "";
  }

  campoMensaje.addEventListener("input", () => (contador.textContent = campoMensaje.value.length));

  const mostrarMensaje = (tipo, texto) => {
    const alerta = document.createElement("div");
    alerta.className = `alert alert-${tipo} py-2`;
    alerta.textContent = texto; // textContent: el mensaje nunca se interpreta como HTML
    msj.replaceChildren(alerta);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      mostrarMensaje("warning", "Completá tu nombre, un correo válido y tu consulta (mínimo 10 caracteres).");
      return;
    }

    boton.disabled = true;
    const { ok, data } = await apiFetch(`/cursos/${curso.id}/consultas`, {
      method: "POST",
      auth: false,
      body: {
        nombre: document.getElementById("consultaNombre").value.trim(),
        email: document.getElementById("consultaEmail").value.trim(),
        mensaje: campoMensaje.value.trim(),
        sitio_web: document.getElementById("consultaSitioWeb").value, // honeypot
      },
    });

    if (ok) {
      mostrarMensaje("success", data.mensaje || "¡Consulta enviada!");
      campoMensaje.value = "";
      contador.textContent = "0";
      form.classList.remove("was-validated");
    } else {
      mostrarMensaje("danger", data.mensaje || "No se pudo enviar la consulta");
    }
    boton.disabled = false;
  });
}
