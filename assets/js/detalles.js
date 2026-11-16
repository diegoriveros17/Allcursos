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
  const estadoInscripcion = await buscarMiInscripcion(curso.id, sesion); // ¿Ya está inscripto?
  window.__zonaInscripcion = { curso, sesion, sinCupos }; // Para redibujar el estado después de inscribirse

  contenedor.innerHTML = `
      <!-- CABECERA DEL CURSO: imagen, título y botón / estado de inscripción -->
      <section class="curso-hero">
        <div class="container">
          <div class="row g-4 g-lg-5 align-items-center">
            <div class="col-lg-5">
              <img src="${escaparDetalle(curso.imagen_url || "assets/img/curso_programacion.webp")}" class="curso-hero-imagen" alt="${escaparDetalle(curso.titulo)}">
            </div>
            <div class="col-lg-7">
              <div class="curso-hero-chips">
                <span class="chip-hero chip-hero-solido">Curso</span>
                <span class="chip-hero">${escaparDetalle(curso.categoria?.nombre || "General")}</span>
              </div>
              <h1 class="curso-hero-titulo">${escaparDetalle(curso.titulo)}</h1>
              <p class="curso-hero-institucion"><i class="bi bi-building me-1"></i>Dictado por <strong>${escaparDetalle(curso.institucion?.nombre || "Institución")}</strong></p>
              <div id="zonaInscripcion">${htmlZonaInscripcion(estadoInscripcion, curso, sesion, sinCupos)}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- DATOS CLAVE (tarjetas que se superponen a la cabecera) -->
      <div class="container curso-datos">
        <div class="row g-3">
          ${tarjetaDatoCurso("bi-laptop", "Modalidad", curso.modalidad, TEXTO_MODALIDAD[curso.modalidad] || "")}
          ${tarjetaDatoCurso("bi-calendar-event", "Inicio de clases", curso.fecha_inicio ? fechaLarga(curso.fecha_inicio) : "A confirmar", curso.fecha_fin ? `Finaliza el ${fechaLarga(curso.fecha_fin)}` : "La institución informará la fecha de cierre")}
          ${tarjetaDatoCurso("bi-clock-history", "Cursada", curso.duracion_horas ? `${curso.duracion_horas} horas` : "Duración a confirmar", curso.direccion_dictado ? `En ${curso.direccion_dictado.calle} ${curso.direccion_dictado.numero || ""}, ${curso.direccion_dictado.ciudad}` : `${curso.cupos_disponibles} de ${curso.cupo_maximo} cupos disponibles`)}
          ${tarjetaDatoCurso("bi-mortarboard", "Certificación", curso.institucion?.nombre || "Institución", "Certificado digital con código QR verificable")}
        </div>
      </div>

      <div class="container pb-5 text-start">
        <div class="row g-4">
          <div class="col-lg-8">
            <div class="card curso-seccion">
              <div class="card-body p-4">
                <h2 class="curso-seccion-titulo"><i class="bi bi-info-circle"></i>Información del curso</h2>
                <p class="curso-descripcion">${escaparDetalle(curso.descripcion)}</p>
                <h3 class="curso-subtitulo">Requisitos</h3>
                ${
                  curso.requisitos && curso.requisitos.length > 0
                    ? `<ul class="lista-requisitos">${curso.requisitos
                        .map((r) => `<li><i class="bi bi-check2-circle"></i><span>${escaparDetalle(r.descripcion)}${r.cursos_requisitos?.es_obligatorio === false ? ' <span class="text-muted">(opcional)</span>' : ""}</span></li>`)
                        .join("")}</ul>`
                    : `<p class="text-muted mb-0"><i class="bi bi-emoji-smile me-1"></i>Este curso no tiene requisitos especiales: cualquier persona puede inscribirse.</p>`
                }
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
      <!-- CONSULTAR SOBRE ESTE CURSO (ciudadanos con sesión: la respuesta llega a su panel) -->
      <div class="card shadow-sm border-0 mt-4 text-start" id="seccionConsulta">
        <div class="card-body p-4">
          <h4 class="fw-bold mb-1"><i class="bi bi-chat-dots me-2"></i>Consultar sobre este curso</h4>
          ${
            sesion
              ? `<p class="text-muted">¿Tenés dudas? Escribile a la institución. La respuesta te llega a <a href="dashboard.html#mis-consultas">Mi Panel › Mis consultas</a> y te avisamos en la campanita.</p>
          <div id="msjConsulta"></div>
          <form id="formConsulta" novalidate>
            <div class="row g-3">
              <div class="col-12">
                <label for="consultaMensaje" class="form-label fw-semibold">Tu consulta</label>
                <textarea class="form-control" id="consultaMensaje" rows="4" minlength="10" maxlength="2000" placeholder="Ej: ¿Qué días y en qué horario se dicta?" required></textarea>
                <div class="form-text text-end"><span id="consultaContador">0</span>/2000</div>
              </div>
              <div class="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small class="text-muted"><i class="bi bi-person-check me-1"></i>Consultás como <strong id="consultaComo"></strong></small>
                <button type="submit" class="btn btn-dark" id="btnEnviarConsulta"><i class="bi bi-send me-1"></i>Enviar consulta</button>
              </div>
            </div>
          </form>`
              : `<p class="text-muted mb-3">Para hacerle una pregunta a la institución tenés que iniciar sesión. Así la respuesta te llega a tu panel, dentro de la plataforma.</p>
          <div class="d-flex flex-wrap gap-2">
            <a href="login.html" class="btn btn-dark"><i class="bi bi-box-arrow-in-right me-1"></i>Iniciar sesión para consultar</a>
            <a href="formulario_registro.html" class="btn btn-outline-secondary">Crear una cuenta</a>
          </div>`
          }
        </div>
      </div>`
          : ""
      }
          </div>

          <!-- COLUMNA LATERAL: cupos, me gusta, compartir y reportar -->
          <div class="col-lg-4">
            <aside class="curso-aside">
              <div class="card curso-seccion">
                <div class="card-body p-4">
                  <p class="curso-subtitulo mt-0 mb-2">Cupos</p>
                  <div class="d-flex justify-content-between small mb-1">
                    <strong>${curso.cupos_disponibles} disponibles</strong>
                    <span class="text-muted">de ${curso.cupo_maximo}</span>
                  </div>
                  <div class="ocupacion-barra ${porcentajeOcupado(curso) >= 100 ? "llena" : porcentajeOcupado(curso) >= 75 ? "alta" : ""}"><span style="width: ${porcentajeOcupado(curso)}%"></span></div>
                  <p class="small text-muted mt-2 mb-0">${sinCupos ? "No quedan cupos: podés anotarte en la lista de espera." : curso.cupos_disponibles <= 5 ? "¡Quedan pocos lugares!" : "Inscripción abierta."}</p>
            <div class="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
              ${
                sesion?.rol === "representante"
                  ? "<span></span>" /* El representante no da me gusta: sólo ve el curso */
                  : `<button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" id="btnLikeCurso">
                <i class="bi bi-hand-thumbs-up" id="iconoLike"></i>
                <span id="contadorLikes">${curso.likes_count || 0}</span>
                <span class="d-none d-sm-inline">Me gusta</span>
              </button>`
              }

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

                  ${
                    sesion?.rol === "representante"
                      ? "" /* El representante no reporta cursos: sólo ve la vista previa */
                      : `<div class="text-center mt-3">
                    <button class="btn btn-sm btn-link text-muted text-decoration-none" data-bs-toggle="modal" data-bs-target="#modalReportarCurso">
                      <i class="bi bi-flag me-1 text-danger"></i> Reportar este curso
                    </button>
                  </div>`
                  }
                </div>
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
            </aside>
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
      mostrarGraciasInscripcion(curso, resp, true);
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
      mostrarGraciasInscripcion(curso, resp, false);
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
      <div class="container" style="padding-top: 7rem; padding-bottom: 3rem;">
      <div class="alert alert-danger text-center shadow-sm" role="alert">
        <h4 class="alert-heading">¡Curso no encontrado!</h4>
        <p>El curso que estás intentando buscar no existe o no está disponible en este momento.</p>
        <hr>
        <a href="index.html" class="btn btn-outline-danger">Volver al Inicio</a>
      </div>
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
    if (!btnLike) return; // Representante: no hay botón de me gusta
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
      mostrarToast("Sólo los estudiantes pueden dar me gusta a los cursos", "advertencia");
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
// CONSULTAR SOBRE EL CURSO (ciudadanos con sesión iniciada)
// ============================================================
function inicializarFormularioConsulta(curso) {
  const form = document.getElementById("formConsulta");
  if (!form) return;

  const msj = document.getElementById("msjConsulta");
  const campoMensaje = document.getElementById("consultaMensaje");
  const contador = document.getElementById("consultaContador");
  const boton = document.getElementById("btnEnviarConsulta");

  // Los datos de contacto salen de la cuenta: sólo se muestra con qué nombre se consulta
  const sesion = obtenerSesion();
  document.getElementById("consultaComo").textContent = [sesion?.nombre, sesion?.apellido].filter(Boolean).join(" ");

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
      mostrarMensaje("warning", "Escribí tu consulta (mínimo 10 caracteres).");
      return;
    }

    boton.disabled = true;
    const { ok, data } = await apiFetch(`/cursos/${curso.id}/consultas`, {
      method: "POST",
      body: { mensaje: campoMensaje.value.trim() },
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

// "2027-03-18" -> "18 de marzo de 2027" (se arma con la fecha local para que no se corra un día)
function fechaLarga(fecha) {
  const [a, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  return new Date(a, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

// ============================================================
// CABECERA DEL CURSO: datos, estado de inscripción y agradecimiento
// ============================================================

// Escapa texto antes de meterlo en HTML (títulos, descripciones, etc. los cargan los usuarios)
function escaparDetalle(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TEXTO_MODALIDAD = {
  Presencial: "Clases en la sede de la institución, con acompañamiento docente.",
  Virtual: "100% a distancia: cursás desde donde estés.",
  Híbrido: "Combina clases presenciales y actividades a distancia.",
};

function tarjetaDatoCurso(icono, etiqueta, valor, detalle) {
  return `
    <div class="col-6 col-lg-3">
      <div class="tarjeta-dato">
        <p class="tarjeta-dato-etiqueta"><i class="bi ${icono}"></i>${escaparDetalle(etiqueta)}</p>
        <p class="tarjeta-dato-valor">${escaparDetalle(valor)}</p>
        ${detalle ? `<p class="tarjeta-dato-detalle">${escaparDetalle(detalle)}</p>` : ""}
      </div>
    </div>`;
}

function porcentajeOcupado(curso) {
  if (!curso.cupo_maximo) return 0;
  return Math.min(100, Math.round(((curso.cupo_maximo - curso.cupos_disponibles) / curso.cupo_maximo) * 100));
}

// Busca si el ciudadano logueado ya está inscripto (o en lista de espera) en este curso
async function buscarMiInscripcion(cursoId, sesion) {
  if (!sesion || sesion.rol !== "ciudadano") return null;
  const { ok, data } = await apiFetch("/inscripciones/mias");
  if (!ok) return null;
  const inscripcion = (data.inscripciones || []).find((i) => Number(i.curso_id ?? i.curso?.id) === Number(cursoId) && i.estado !== "Cancelado");
  if (inscripcion) return { estado: inscripcion.estado };
  const enEspera = (data.listaEspera || []).some((le) => Number(le.curso_id ?? le.curso?.id) === Number(cursoId));
  return enEspera ? { estado: "Lista de espera" } : null;
}

// Botón de inscripción, o el aviso de que ya está inscripto
function htmlZonaInscripcion(estado, curso, sesion, sinCupos) {
  if (sesion && sesion.rol !== "ciudadano") {
    return `<div class="estado-hero"><span class="estado-hero-icono"><i class="bi bi-info-lg"></i></span>
      <div><strong>Sólo los estudiantes pueden inscribirse</strong><span>Los representantes y administradores ven el curso como vista previa.</span></div></div>`;
  }
  if (!estado) {
    return `
      <button class="btn btn-hero-inscribirse" id="btnInscribirse">
        <i class="bi ${sinCupos ? "bi-hourglass-split" : "bi-pencil-square"} me-2"></i>${sinCupos ? "Anotarme en lista de espera" : "Inscribirme a este curso"}
      </button>
      <p class="curso-hero-nota">${sinCupos ? "No quedan cupos: te avisamos si se libera un lugar." : `<i class="bi bi-people me-1"></i>Quedan ${curso.cupos_disponibles} ${curso.cupos_disponibles === 1 ? "lugar" : "lugares"} · inscripción gratuita`}</p>`;
  }
  const estados = {
    "Lista de espera": { icono: "bi-hourglass-split", titulo: "Estás en la lista de espera", texto: "Te avisamos apenas se libere un lugar.", clase: "espera" },
    "En espera": { icono: "bi-hourglass-split", titulo: "Tu inscripción está en espera", texto: "La institución la va a confirmar pronto.", clase: "espera" },
    Inscripto: { icono: "bi-check-lg", titulo: "¡Ya estás inscripto en este curso!", texto: "Seguí tu inscripción y las novedades desde Mi Panel.", clase: "" },
    Cursando: { icono: "bi-play-fill", titulo: "Estás cursando este curso", texto: "¡Éxitos! Las novedades te llegan a Mi Panel.", clase: "" },
    Finalizado: { icono: "bi-award-fill", titulo: "¡Completaste este curso!", texto: "Descargá tu certificado desde Mi Panel.", clase: "" },
  };
  const e = estados[estado.estado] || estados.Inscripto;
  return `
    <div class="estado-hero ${e.clase}">
      <span class="estado-hero-icono"><i class="bi ${e.icono}"></i></span>
      <div><strong>${e.titulo}</strong><span>${e.texto}</span></div>
      <a href="dashboard.html" class="btn btn-sm btn-light ms-auto fw-semibold">Ir a Mi Panel</a>
    </div>`;
}

// Ventana de agradecimiento después de inscribirse (con un poco de confeti)
function mostrarGraciasInscripcion(curso, resp, conSesion) {
  const enEspera = !!resp.listaEspera;
  // Actualiza la cabecera: el botón pasa a "Ya estás inscripto"
  const zona = document.getElementById("zonaInscripcion");
  if (zona && conSesion) zona.innerHTML = htmlZonaInscripcion({ estado: enEspera ? "Lista de espera" : "Inscripto" }, curso, obtenerSesion(), false);
  else if (zona) document.getElementById("btnInscribirse")?.setAttribute("disabled", "true");

  document.getElementById("modalGracias")?.remove();
  const colores = ["#2f7d6b", "#6fd1b8", "#1e3a5f", "#f5b942", "#e85d75"];
  const confeti = Array.from({ length: 18 }, (_, i) =>
    `<span style="left:${5 + ((i * 53) % 90)}%; background:${colores[i % colores.length]}; animation-delay:${(i % 6) * 0.08}s; --giro:${(i % 2 ? 1 : -1) * (180 + i * 20)}deg"></span>`,
  ).join("");

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="modal fade" id="modalGracias" tabindex="-1" aria-labelledby="graciasTitulo" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-gracias">
          <div class="confeti" aria-hidden="true">${confeti}</div>
          <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          <div class="modal-body text-center p-4 p-md-5">
            <div class="gracias-icono ${enEspera ? "espera" : ""}"><i class="bi ${enEspera ? "bi-hourglass-split" : "bi-check-lg"}"></i></div>
            <h3 class="gracias-titulo" id="graciasTitulo">${enEspera ? "¡Te anotamos en la lista de espera!" : "¡Gracias por inscribirte!"}</h3>
            <p class="gracias-texto">${
              enEspera
                ? `Por ahora no quedan cupos en <strong>"${escaparDetalle(curso.titulo)}"</strong>, pero ya tenés tu lugar en la fila.`
                : `Ya tenés tu lugar en <strong>"${escaparDetalle(curso.titulo)}"</strong>. ¡Nos alegra que aprendas con nosotros!`
            }</p>
            <ul class="gracias-pasos">
              <li><i class="bi bi-bell"></i><span>${enEspera ? "Te avisamos en cuanto se libere un lugar." : "Te avisamos las novedades del curso por la campanita y por email."}</span></li>
              <li><i class="bi bi-speedometer2"></i><span>Seguí tu inscripción desde <strong>Mi Panel</strong>.</span></li>
              <li><i class="bi bi-award"></i><span>Al terminar, descargás tu certificado con código QR.</span></li>
            </ul>
            ${resp.aviso ? `<div class="alert alert-info small text-start py-2">${escaparDetalle(resp.aviso)}</div>` : ""}
            <div class="d-grid gap-2 mt-4">
              ${conSesion ? `<a href="dashboard.html" class="btn btn-primary btn-lg"><i class="bi bi-speedometer2 me-2"></i>Ir a Mi Panel</a>` : `<a href="login.html" class="btn btn-primary btn-lg"><i class="bi bi-box-arrow-in-right me-2"></i>Iniciar sesión para ver mis cursos</a>`}
              <a href="index.html" class="btn btn-outline-secondary">Seguir explorando cursos</a>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  );
  new bootstrap.Modal(document.getElementById("modalGracias")).show();
}
