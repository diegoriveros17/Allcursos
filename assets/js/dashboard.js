// assets/js/dashboard.js
// Panel de control ("Mi Panel"): cabecera con saludo, métricas animadas y las
// secciones de cada rol (ciudadano / representante). Los textos que vienen del
// usuario se insertan con h() (dom_utils.js), así nunca se interpretan como HTML.

document.addEventListener("DOMContentLoaded", () => {
  const sesion = obtenerSesion();

  if (!sesion) {
    window.location.href = "login.html";
    return;
  }
  if (sesion.rol === "administrador") {
    window.location.href = "admin.html";
    return;
  }

  dibujarCabeceraPanel(sesion);

  const panelCiudadano = document.getElementById("dashCiudadano");
  const panelRepresentante = document.getElementById("dashRepresentante");

  if (sesion.rol === "representante") {
    dibujarMetricas([
      { clave: "cursos", icono: "bi-collection-play", etiqueta: "Cursos publicados", color: "primario", href: "#seccion-cursos" },
      { clave: "inscriptos", icono: "bi-people", etiqueta: "Inscriptos en total", color: "verde", href: "#seccion-cursos" },
      { clave: "ocupacion", icono: "bi-pie-chart", etiqueta: "Ocupación promedio", color: "azul", sufijo: "%", href: "#seccion-cursos" },
      { clave: "consultas", icono: "bi-chat-dots", etiqueta: "Consultas sin leer", color: "ambar", href: "#consultas" },
    ]);
    mostrarEstadoAprobacion(sesion);
    panelRepresentante?.classList.remove("d-none");
    panelCiudadano?.classList.add("d-none");
    prepararNavegacionSecciones();
    prepararFiltrosTablaCursos();
    cargarTablaRepresentante();
    prepararFormularioNuevoCurso();
    prepararFormularioNuevaEncuesta();
    cargarEncuestasRepresentante();
    cargarConsultasRepresentante(); // En consultas_representante.js
  } else {
    dibujarMetricas([
      { clave: "activos", icono: "bi-play-circle", etiqueta: "Cursos en marcha", color: "primario", href: "#mis-cursos" },
      { clave: "finalizados", icono: "bi-award", etiqueta: "Certificados obtenidos", color: "verde", href: "#mis-cursos" },
      { clave: "encuestas", icono: "bi-clipboard2-check", etiqueta: "Encuestas pendientes", color: "azul", href: "#mis-encuestas" },
      { clave: "respuestas", icono: "bi-chat-dots", etiqueta: "Respuestas nuevas", color: "ambar", href: "#mis-consultas" },
    ]);
    dibujarPerfilCiudadano(sesion);
    panelCiudadano?.classList.remove("d-none");
    panelRepresentante?.classList.add("d-none");
    cargarTablaCiudadano();
    cargarEncuestasCiudadano(); // En encuesta_responder.js
    cargarConsultasCiudadano(); // En consultas_representante.js
  }
});

// ==========================================
// CABECERA Y MÉTRICAS (comunes a los dos roles)
// ==========================================
function inicialesDe(sesion) {
  const partes = [sesion.nombre, sesion.apellido].filter(Boolean).join(" ").trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

// Foto del usuario o, si no tiene, un círculo con sus iniciales
function avatarDe(sesion) {
  return sesion.avatar_url ? h("img", { src: sesion.avatar_url, alt: "" }) : inicialesDe(sesion);
}

function saludoSegunHora() {
  const hora = new Date().getHours();
  if (hora < 6) return "Buenas noches";
  if (hora < 13) return "Buen día";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

function dibujarCabeceraPanel(sesion) {
  const esRepresentante = sesion.rol === "representante";
  document.getElementById("panelAvatar")?.replaceChildren(avatarDe(sesion));
  document.getElementById("saludoMomento").textContent = saludoSegunHora();
  document.getElementById("saludoUsuario").textContent = `¡Hola, ${sesion.nombre || "de nuevo"}!`;
  document.getElementById("bajadaPanel").textContent = esRepresentante
    ? "Administrá la oferta de cursos de tu institución, tus encuestas y las consultas de los ciudadanos."
    : "Seguí tus cursos, descargá tus certificados y hablá con las instituciones desde un solo lugar.";

  const chips = [
    h("span", { class: "panel-chip" }, h("i", { class: `bi ${esRepresentante ? "bi-building" : "bi-mortarboard"} me-1` }), esRepresentante ? "Representante" : "Estudiante"),
  ];
  if (esRepresentante && sesion.institucion?.nombre) {
    chips.push(h("span", { class: "panel-chip" }, h("i", { class: "bi bi-geo-alt me-1" }), sesion.institucion.nombre));
  }
  document.getElementById("chipsCabecera")?.replaceChildren(...chips);

  const acciones = esRepresentante
    ? [
        h("button", { type: "button", class: "btn btn-hero-claro js-nuevo-curso", "data-bs-toggle": "modal", "data-bs-target": "#modalNuevoCurso" },
          h("i", { class: "bi bi-plus-lg me-1" }), "Publicar curso"),
        h("a", { href: "configuracion.html", class: "btn btn-hero-borde" }, h("i", { class: "bi bi-gear me-1" }), "Mi cuenta"),
      ]
    : [
        h("a", { href: "index.html", class: "btn btn-hero-claro" }, h("i", { class: "bi bi-search me-1" }), "Explorar cursos"),
        h("a", { href: "configuracion.html", class: "btn btn-hero-borde" }, h("i", { class: "bi bi-gear me-1" }), "Mi cuenta"),
      ];
  document.getElementById("accionesCabecera")?.replaceChildren(...acciones);
}

function dibujarMetricas(metricas) {
  const contenedor = document.getElementById("metricasPanel");
  if (!contenedor) return;
  contenedor.replaceChildren(
    ...metricas.map((m) =>
      h("div", { class: "col-6 col-lg-3" },
        h("a", { href: m.href, class: `tarjeta-metrica metrica-${m.color}`, dataset: { metrica: m.clave, sufijo: m.sufijo || "" } },
          h("span", { class: "metrica-icono" }, h("i", { class: `bi ${m.icono}` })),
          h("span", { class: "metrica-datos" },
            h("span", { class: "metrica-valor" }, h("span", { class: "placeholder-glow" }, h("span", { class: "placeholder col-12 rounded" }))),
            h("span", { class: "metrica-etiqueta" }, m.etiqueta),
          ),
        ),
      ),
    ),
  );
}

// Actualiza una métrica (y los contadores de la navegación) con un conteo animado.
// También la llaman encuesta_responder.js y consultas_representante.js.
function actualizarMetrica(clave, valor) {
  const numero = Number(valor) || 0;
  document.querySelectorAll(`[data-metrica="${clave}"] .metrica-valor`).forEach((el) => {
    const sufijo = el.closest("[data-metrica]").dataset.sufijo || "";
    animarNumero(el, numero, sufijo);
  });
  document.querySelectorAll(`[data-contador="${clave}"]`).forEach((el) => {
    el.textContent = numero;
    el.classList.toggle("vacio", numero === 0);
  });
}

function animarNumero(el, destino, sufijo = "") {
  const desde = Number(el.dataset.valor) || 0;
  el.dataset.valor = destino;
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (sinMovimiento || desde === destino) {
    el.textContent = `${destino}${sufijo}`;
    return;
  }
  const duracion = 700;
  const inicio = performance.now();
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / duracion);
    const suave = 1 - Math.pow(1 - t, 3); // Desacelera al final
    el.textContent = `${Math.round(desde + (destino - desde) * suave)}${sufijo}`;
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

// "2027-03-18" -> "18/03/2027" (se arma a mano para que la zona horaria no corra el día)
function fechaCorta(fecha) {
  if (!fecha) return "";
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : "";
}

// Texto del período de cursado: "18/03/2027 – 30/06/2027", "Desde 18/03/2027" o "Hasta ..."
function periodoCurso(curso) {
  const inicio = fechaCorta(curso.fecha_inicio);
  const fin = fechaCorta(curso.fecha_fin);
  if (inicio && fin) return `${inicio} – ${fin}`;
  if (inicio) return `Desde ${inicio}`;
  if (fin) return `Hasta ${fin}`;
  return "";
}

// Estado vacío con ícono, texto y (opcional) un botón de acción
function estadoVacioPanel(icono, titulo, texto, accion) {
  return h("div", { class: "vacio-panel" },
    h("i", { class: `bi ${icono}` }),
    h("p", { class: "fw-semibold mb-1" }, titulo),
    texto && h("p", { class: "small text-muted mb-0" }, texto),
    accion,
  );
}

// ==========================================
// CIUDADANO: perfil, mis cursos, lista de espera y certificados
// ==========================================
function dibujarPerfilCiudadano(sesion) {
  const contenedor = document.getElementById("infoPerfilCiudadano");
  if (!contenedor) return;
  const dato = (icono, texto) => texto && h("li", {}, h("i", { class: `bi ${icono}` }), h("span", {}, texto));
  contenedor.replaceChildren(
    h("div", { class: "perfil-panel" },
      h("div", { class: "perfil-panel-avatar" }, avatarDe(sesion)),
      h("p", { class: "perfil-panel-nombre" }, [sesion.nombre, sesion.apellido].filter(Boolean).join(" ")),
      h("span", { class: "rol-chip" }, h("i", { class: "bi bi-mortarboard me-1" }), "Estudiante"),
      h("ul", { class: "perfil-datos" },
        dato("bi-envelope", sesion.email_login || sesion.email),
        dato("bi-person-vcard", sesion.dni ? `DNI ${sesion.dni}` : ""),
      ),
      h("a", { href: "configuracion.html", class: "btn btn-outline-primary btn-sm w-100" }, h("i", { class: "bi bi-pencil me-1" }), "Editar mis datos"),
    ),
  );
}

// Grupos para las pestañas de "Mis cursos"
const GRUPOS_CURSOS = [
  { clave: "todos", texto: "Todos", estados: null },
  { clave: "activos", texto: "En marcha", estados: ["En espera", "Inscripto", "Cursando"] },
  { clave: "finalizados", texto: "Finalizados", estados: ["Finalizado"] },
  { clave: "cancelados", texto: "Dados de baja", estados: ["Cancelado"] },
];

const ESTILO_ESTADO_INSCRIPCION = {
  "En espera": { clase: "espera", icono: "bi-hourglass-split" },
  Inscripto: { clase: "inscripto", icono: "bi-check2-circle" },
  Cursando: { clase: "cursando", icono: "bi-play-circle" },
  Finalizado: { clase: "finalizado", icono: "bi-award" },
  Cancelado: { clase: "cancelado", icono: "bi-x-circle" },
};

let misInscripciones = [];
let grupoCursosActivo = "todos";

async function cargarTablaCiudadano() {
  const lista = document.getElementById("listaCursosCiudadano");
  if (!lista) return;

  const { ok, data } = await apiFetch("/inscripciones/mias");
  if (!ok) {
    lista.replaceChildren(h("p", { class: "text-danger small mb-0" }, data.mensaje || "No se pudieron cargar tus cursos"));
    return;
  }

  misInscripciones = data.inscripciones || [];
  const cuenta = (estados) => misInscripciones.filter((i) => estados.includes(i.estado)).length;
  const activos = cuenta(["En espera", "Inscripto", "Cursando"]);
  const finalizados = misInscripciones.filter((i) => certificadoVigente(i)).length; // Certificados que la institución ya emitió
  actualizarMetrica("activos", activos);
  actualizarMetrica("finalizados", finalizados);

  dibujarFiltrosMisCursos();
  dibujarMisCursos();
  dibujarListaEspera(data.listaEspera || []);
}

function dibujarFiltrosMisCursos() {
  const contenedor = document.getElementById("filtrosMisCursos");
  if (!contenedor) return;
  contenedor.replaceChildren(
    ...GRUPOS_CURSOS.map((g) => {
      const cantidad = g.estados ? misInscripciones.filter((i) => g.estados.includes(i.estado)).length : misInscripciones.length;
      return h("button", {
        type: "button",
        role: "tab",
        class: `pildora${grupoCursosActivo === g.clave ? " activa" : ""}`,
        "aria-selected": grupoCursosActivo === g.clave ? "true" : "false",
        onClick: () => {
          grupoCursosActivo = g.clave;
          dibujarFiltrosMisCursos();
          dibujarMisCursos();
        },
      }, g.texto, h("span", { class: "pildora-cantidad" }, cantidad));
    }),
  );
}

function dibujarMisCursos() {
  const lista = document.getElementById("listaCursosCiudadano");
  if (!lista) return;

  if (misInscripciones.length === 0) {
    lista.replaceChildren(
      estadoVacioPanel("bi-journal-plus", "Todavía no te inscribiste a ningún curso",
        "Explorá la oferta de capacitaciones y anotate en la que más te guste.",
        h("a", { href: "index.html", class: "btn btn-primary btn-sm mt-3" }, h("i", { class: "bi bi-search me-1" }), "Explorar cursos")),
    );
    return;
  }

  const grupo = GRUPOS_CURSOS.find((g) => g.clave === grupoCursosActivo);
  const visibles = grupo.estados ? misInscripciones.filter((i) => grupo.estados.includes(i.estado)) : misInscripciones;
  if (visibles.length === 0) {
    lista.replaceChildren(estadoVacioPanel("bi-inbox", "No hay cursos en esta pestaña", null));
    return;
  }
  lista.replaceChildren(...visibles.map(tarjetaMiCurso));
}

// El certificado sólo existe si la institución lo emitió (y no lo anuló)
const certificadoVigente = (item) => !!item.certificado && !item.certificado.anulado;

// Pasos del cursado: Inscripto → Cursando → Finalizado → Certificado (lo emite la institución)
function pasosDelCurso(estado, certificado = false) {
  const pasos = ["Inscripto", "Cursando", "Finalizado", "Certificado"];
  const actual = certificado ? 3 : pasos.indexOf(estado);
  return h("ol", { class: "pasos-curso", "aria-label": "Avance del curso" },
    pasos.map((p, i) => h("li", { class: [i <= actual && "hecho", i === actual && "actual"].filter(Boolean).join(" ") }, p)),
  );
}

function tarjetaMiCurso(item) {
  const curso = item.curso || {};
  const estilo = ESTILO_ESTADO_INSCRIPCION[item.estado] || ESTILO_ESTADO_INSCRIPCION.Inscripto;
  const enlace = `detalles.html?id=${encodeURIComponent(curso.id)}`;
  const fecha = item.fecha_inscripcion ? new Date(item.fecha_inscripcion) : null;

  const acciones = [];
  if (certificadoVigente(item)) {
    acciones.push(h("button", { type: "button", class: "btn btn-sm btn-success", onClick: (e) => descargarCertificado(item.id, e.currentTarget) },
      h("i", { class: "bi bi-file-earmark-arrow-down me-1" }), "Certificado"));
  }
  acciones.push(h("a", { href: enlace, class: "btn btn-sm btn-outline-primary" }, "Ver curso"));
  if (item.estado !== "Finalizado" && item.estado !== "Cancelado") {
    acciones.push(h("button", { type: "button", class: "btn btn-sm btn-link text-danger text-decoration-none", onClick: () => cancelarInscripcion(item.id, curso.titulo) },
      h("i", { class: "bi bi-box-arrow-right me-1" }), "Darme de baja"));
  }

  let avance;
  if (item.estado === "Cancelado")
    avance = h("p", { class: "mi-curso-aviso" }, h("i", { class: "bi bi-info-circle me-1" }),
      "Te diste de baja de este curso.", item.motivo_baja && ` Motivo: ${item.motivo_baja}.`);
  else if (item.estado === "En espera") avance = h("p", { class: "mi-curso-aviso" }, h("i", { class: "bi bi-hourglass-split me-1" }), "Tu inscripción está pendiente de confirmación.");
  else if (item.estado === "Finalizado" && !certificadoVigente(item))
    avance = [
      pasosDelCurso(item.estado),
      h("p", { class: "mi-curso-aviso" }, h("i", { class: "bi bi-hourglass-split me-1" }),
        item.certificado?.anulado
          ? "La institución anuló tu certificado. Si creés que es un error, escribile desde Consultas."
          : "Terminaste la cursada. La institución está revisando la asistencia y te avisa cuando emita tu certificado."),
    ];
  else avance = pasosDelCurso(item.estado, certificadoVigente(item));

  return h("article", { class: `mi-curso estado-${estilo.clase}` },
    h("a", { href: enlace, class: "mi-curso-imagen", "aria-hidden": "true", tabindex: "-1" },
      curso.imagen_url ? h("img", { src: curso.imagen_url, alt: "", loading: "lazy" }) : h("i", { class: "bi bi-mortarboard" })),
    h("div", { class: "mi-curso-cuerpo" },
      h("div", { class: "mi-curso-cabecera" },
        h("div", { class: "min-w-0" },
          h("a", { href: enlace, class: "mi-curso-titulo" }, curso.titulo || "Curso"),
          h("div", { class: "mi-curso-meta" },
            curso.institucion?.nombre && h("span", {}, h("i", { class: "bi bi-building me-1" }), curso.institucion.nombre),
            curso.modalidad && h("span", {}, h("i", { class: "bi bi-laptop me-1" }), curso.modalidad),
            curso.duracion_horas && h("span", {}, h("i", { class: "bi bi-clock me-1" }), `${curso.duracion_horas} h`),
            periodoCurso(curso) && h("span", {}, h("i", { class: "bi bi-calendar-event me-1" }), periodoCurso(curso)),
          ),
        ),
        h("span", { class: `estado-chip ${estilo.clase}` }, h("i", { class: `bi ${estilo.icono}` }), item.estado === "Cancelado" ? "Dado de baja" : item.estado),
      ),
      avance,
      h("div", { class: "mi-curso-pie" },
        h("span", { class: "mi-curso-fecha" }, fecha && !isNaN(fecha) ? `Inscripto el ${fecha.toLocaleDateString("es-AR")}` : ""),
        h("div", { class: "d-flex flex-wrap gap-1 align-items-center" }, acciones),
      ),
    ),
  );
}

function dibujarListaEspera(listaEspera) {
  const card = document.getElementById("cardListaEspera");
  const contenedor = document.getElementById("listaEsperaCiudadano");
  if (!card || !contenedor) return;
  card.classList.toggle("d-none", listaEspera.length === 0);
  contenedor.replaceChildren(
    ...listaEspera.map((le) =>
      h("li", {},
        h("span", { class: "lista-espera-icono" }, h("i", { class: "bi bi-hourglass-split" })),
        h("a", { href: `detalles.html?id=${encodeURIComponent(le.curso?.id ?? "")}`, class: "flex-grow-1 fw-semibold text-decoration-none" }, le.curso?.titulo || "Curso"),
        h("span", { class: "estado-chip espera" }, "En espera"),
      ),
    ),
  );
}

// Motivos para darse de baja (los mismos que valida el servidor)
const MOTIVOS_BAJA_CURSO = [
  { texto: "Problemas de horario", icono: "bi-clock" },
  { texto: "Cambié de intereses", icono: "bi-arrow-left-right" },
  { texto: "Motivos personales o de salud", icono: "bi-heart-pulse" },
  { texto: "Problemas de traslado o distancia", icono: "bi-geo-alt" },
  { texto: "El curso no era lo que esperaba", icono: "bi-emoji-neutral" },
  { texto: "Me inscribí por error", icono: "bi-x-circle" },
  { texto: "Otro motivo", icono: "bi-three-dots" },
];

// Formulario para darse de baja: el alumno elige un motivo y puede explicarlo
function cancelarInscripcion(id, tituloCurso = "este curso") {
  document.getElementById("modalBajaCurso")?.remove();
  const msj = h("div");
  const comentario = h("textarea", { class: "form-control", id: "bajaComentario", rows: "3", maxlength: "500", placeholder: "Contanos con tus palabras por qué dejás el curso (opcional)" });
  const contador = h("div", { class: "form-text text-end" }, "0 / 500");
  const etiquetaComentario = h("label", { for: "bajaComentario", class: "form-label" }, "Comentario ", h("span", { class: "text-muted fw-normal" }, "(opcional)"));
  comentario.addEventListener("input", () => (contador.textContent = `${comentario.value.length} / 500`));

  const opciones = MOTIVOS_BAJA_CURSO.map((m, i) => [
    h("input", { type: "radio", class: "btn-check", name: "motivoBaja", id: `motivoBaja${i}`, value: m.texto, autocomplete: "off" }),
    h("label", { class: "opcion-baja", for: `motivoBaja${i}` }, h("i", { class: `bi ${m.icono}` }), m.texto),
  ]);
  const boton = h("button", { type: "submit", class: "btn btn-danger", form: "formBajaCurso" }, h("i", { class: "bi bi-box-arrow-right me-1" }), "Confirmar baja");

  const form = h("form", { id: "formBajaCurso", novalidate: true },
    msj,
    h("p", { class: "fw-semibold mb-2" }, "¿Por qué dejás el curso?"),
    h("div", { class: "opciones-baja mb-3", role: "radiogroup", "aria-label": "Motivo de la baja" }, opciones),
    etiquetaComentario, comentario, contador,
    h("div", { class: "aviso-baja mt-3" }, h("i", { class: "bi bi-info-circle" }),
      h("span", {}, "Al darte de baja liberás tu lugar para otra persona. Tu respuesta le llega a la institución para mejorar sus cursos.")),
  );

  // Si elige "Otro motivo", el comentario pasa a ser obligatorio
  form.addEventListener("change", () => {
    const otro = form.querySelector('input[name="motivoBaja"]:checked')?.value === "Otro motivo";
    etiquetaComentario.lastChild.textContent = otro ? "(obligatorio)" : "(opcional)";
    comentario.placeholder = otro ? "Contanos por qué dejás el curso" : "Contanos con tus palabras por qué dejás el curso (opcional)";
  });

  const modalEl = h("div", { class: "modal fade", id: "modalBajaCurso", tabindex: "-1", "aria-labelledby": "tituloBajaCurso", "aria-hidden": "true" },
    h("div", { class: "modal-dialog modal-dialog-centered modal-dialog-scrollable" },
      h("div", { class: "modal-content" },
        h("div", { class: "modal-header bg-danger text-white" },
          h("div", {},
            h("h5", { class: "modal-title", id: "tituloBajaCurso" }, h("i", { class: "bi bi-box-arrow-right me-2" }), "Darme de baja del curso"),
            h("small", { class: "modal-subtitulo" }, tituloCurso),
          ),
          h("button", { type: "button", class: "btn-close btn-close-white", "data-bs-dismiss": "modal", "aria-label": "Cerrar" }),
        ),
        h("div", { class: "modal-body text-start" }, form),
        h("div", { class: "modal-footer" },
          h("button", { type: "button", class: "btn btn-outline-secondary", "data-bs-dismiss": "modal" }, "Seguir en el curso"),
          boton,
        ),
      ),
    ),
  );
  document.body.appendChild(modalEl);
  const modal = new bootstrap.Modal(modalEl);
  modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const motivo = form.querySelector('input[name="motivoBaja"]:checked')?.value;
    const texto = comentario.value.trim();
    const error = (t) => msj.replaceChildren(h("div", { class: "alert alert-danger py-2 small" }, h("i", { class: "bi bi-exclamation-triangle me-1" }), t));
    if (!motivo) return error("Elegí un motivo para continuar.");
    if (motivo === "Otro motivo" && texto.length < 5) {
      comentario.focus();
      return error("Contanos brevemente por qué dejás el curso.");
    }

    boton.disabled = true;
    const { ok, data } = await apiFetch(`/inscripciones/${id}`, {
      method: "PUT",
      body: { estado: "Cancelado", motivo_baja: motivo, comentario_baja: texto },
    });
    boton.disabled = false;
    if (ok) {
      modal.hide();
      mostrarToast("Te diste de baja del curso. ¡Gracias por contarnos el motivo!", "info");
      cargarTablaCiudadano();
    } else {
      error(data.mensaje || "No se pudo completar la baja");
    }
  });

  modal.show();
}

// La descarga del PDF necesita el header Authorization, por eso no puede ser
// un simple <a href>: se pide como blob y se dispara la descarga manualmente.
async function descargarCertificado(inscripcionId, boton) {
  const token = localStorage.getItem("token");
  const textoOriginal = boton?.innerHTML;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Generando...`;
  }
  try {
    const respuesta = await fetch(
      `${window.location.origin}/api/inscripciones/${inscripcionId}/certificado`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      mostrarToast(data.mensaje || "No se pudo descargar el certificado", "error");
      return;
    }
    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificado_${inscripcionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    mostrarToast("¡Certificado descargado!", "exito");
  } catch (error) {
    mostrarToast("No se pudo conectar con el servidor para descargar el certificado", "error");
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal;
    }
  }
}

// ==========================================
// CIUDADANO: encuestas disponibles
// (la lógica vive en encuesta_responder.js: cargarEncuestasCiudadano)
// ==========================================

// ==========================================
// REPRESENTANTE: estado de la cuenta y navegación
// ==========================================
function mostrarEstadoAprobacion(sesion) {
  const alerta = document.getElementById("alertaEstadoRepresentante");
  const estado = sesion.estado_aprobacion;
  if (estado !== "pendiente" && estado !== "rechazado") return;

  const pendiente = estado === "pendiente";
  alerta?.classList.remove("d-none");
  alerta?.replaceChildren(
    h("div", { class: `aviso-panel ${pendiente ? "aviso-ambar" : "aviso-rojo"}`, role: "alert" },
      h("span", { class: "aviso-panel-icono" }, h("i", { class: `bi ${pendiente ? "bi-hourglass-split" : "bi-x-octagon"}` })),
      h("div", {},
        h("p", { class: "fw-bold mb-1" }, pendiente ? "Tu cuenta está en proceso de aprobación" : "Tu solicitud fue rechazada"),
        h("p", { class: "small mb-0" }, pendiente
          ? `Los administradores están revisando tu solicitud para representar a ${sesion.institucion?.nombre || "tu institución"}. Mientras tanto no podés publicar cursos.`
          : "La administración rechazó tu solicitud como representante. Si creés que es un error, comunicate con la plataforma."),
      ),
    ),
  );
  document.querySelectorAll(".js-nuevo-curso").forEach((boton) => {
    boton.disabled = true;
    boton.classList.add("disabled");
    boton.title = pendiente ? "Tu cuenta está pendiente de aprobación" : "Tu solicitud fue rechazada";
  });
}

// Resalta en la barra la sección que se está viendo
function prepararNavegacionSecciones() {
  const nav = document.getElementById("navSecciones");
  if (!nav || !("IntersectionObserver" in window)) return;
  const enlaces = [...nav.querySelectorAll("a")];
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        enlaces.forEach((a) => a.classList.toggle("activa", a.getAttribute("href") === `#${entrada.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  enlaces.forEach((a) => {
    const seccion = document.querySelector(a.getAttribute("href"));
    if (seccion) observador.observe(seccion);
  });
}

// ==========================================
// REPRESENTANTE: sus cursos (tabla con buscador y ocupación)
// ==========================================
function prepararFiltrosTablaCursos() {
  document.getElementById("buscarCursoPanel")?.addEventListener("input", dibujarTablaCursos);
  document.getElementById("filtroModalidadPanel")?.addEventListener("change", dibujarTablaCursos);
}

async function cargarTablaRepresentante() {
  const tbody = document.getElementById("tablaCursosRepresentante");
  if (!tbody) return;

  const { ok, data } = await apiFetch("/cursos/mis-cursos");
  if (!ok) {
    tbody.replaceChildren(h("tr", {}, h("td", { colspan: "4", class: "text-center text-danger py-4" }, data.mensaje || "No se pudieron cargar tus cursos")));
    return;
  }

  const cursos = data.cursos || [];
  window.__misCursos = cursos;
  const totalInscriptos = cursos.reduce((acc, c) => acc + (c.inscriptos || 0), 0);
  const totalCupos = cursos.reduce((acc, c) => acc + (c.cupo_maximo || 0), 0);
  actualizarMetrica("cursos", cursos.length);
  actualizarMetrica("inscriptos", totalInscriptos);
  actualizarMetrica("ocupacion", totalCupos ? Math.round((totalInscriptos / totalCupos) * 100) : 0);

  dibujarTablaCursos();

  // Cursos del modal de encuestas (abiertos y terminados por separado)
  cargarCursosEnModalEncuesta(cursos);
}

function barraOcupacion(inscriptos, cupo) {
  const porcentaje = cupo ? Math.min(100, Math.round((inscriptos / cupo) * 100)) : 0;
  const nivel = porcentaje >= 100 ? "llena" : porcentaje >= 75 ? "alta" : "";
  const barra = h("span", { style: "width: 0%" });
  // Se anima desde 0 al dibujarse
  requestAnimationFrame(() => requestAnimationFrame(() => (barra.style.width = `${porcentaje}%`)));
  const libres = Math.max(0, cupo - inscriptos);
  return h("div", { class: "ocupacion" },
    h("div", { class: "d-flex justify-content-between small" },
      h("span", { class: "fw-semibold" }, `${inscriptos} / ${cupo}`),
      h("span", { class: "text-muted" }, libres === 0 ? "Sin vacantes" : `${libres} ${libres === 1 ? "vacante" : "vacantes"}`),
    ),
    h("div", { class: `ocupacion-barra ${nivel}`, role: "progressbar", "aria-valuenow": porcentaje, "aria-valuemin": "0", "aria-valuemax": "100" }, barra),
  );
}

function dibujarTablaCursos() {
  const tbody = document.getElementById("tablaCursosRepresentante");
  const contador = document.getElementById("contadorCursosPanel");
  const cursos = window.__misCursos || [];
  if (!tbody) return;

  if (cursos.length === 0) {
    if (contador) contador.textContent = "";
    tbody.replaceChildren(
      h("tr", {}, h("td", { colspan: "4", class: "border-0" },
        estadoVacioPanel("bi-collection-play", "Todavía no publicaste ningún curso",
          "Publicá tu primer curso y empezá a recibir inscripciones.",
          h("button", { type: "button", class: "btn btn-primary btn-sm mt-3", onClick: () => document.getElementById("btnAbrirNuevoCurso")?.click() },
            h("i", { class: "bi bi-plus-circle me-1" }), "Publicar nuevo curso")),
      )),
    );
    return;
  }

  const texto = (document.getElementById("buscarCursoPanel")?.value || "").trim().toLowerCase();
  const modalidad = document.getElementById("filtroModalidadPanel")?.value || "";
  const visibles = cursos.filter((c) =>
    (!modalidad || c.modalidad === modalidad) &&
    (!texto || `${c.titulo} ${c.categoria?.nombre || ""}`.toLowerCase().includes(texto)),
  );
  if (contador) contador.textContent = `Mostrando ${visibles.length} de ${cursos.length}`;

  if (visibles.length === 0) {
    tbody.replaceChildren(h("tr", {}, h("td", { colspan: "4", class: "text-center text-muted py-4" }, "Ningún curso coincide con la búsqueda.")));
    return;
  }

  tbody.replaceChildren(
    ...visibles.map((curso) =>
      h("tr", {},
        h("td", {},
          h("div", { class: "d-flex align-items-center gap-3" },
            h("span", { class: "curso-miniatura" },
              curso.imagen_url ? h("img", { src: curso.imagen_url, alt: "", loading: "lazy" }) : h("i", { class: "bi bi-mortarboard" })),
            h("div", { class: "min-w-0" },
              h("a", { href: `detalles.html?id=${encodeURIComponent(curso.id)}`, class: "curso-tabla-titulo", title: "Ver cómo lo ven los ciudadanos" }, curso.titulo),
              h("div", { class: "curso-tabla-meta" },
                curso.categoria?.nombre && h("span", { class: "etiqueta-suave" }, curso.categoria.nombre),
                h("span", {}, h("i", { class: "bi bi-laptop me-1" }), curso.modalidad),
                curso.duracion_horas && h("span", {}, h("i", { class: "bi bi-clock me-1" }), `${curso.duracion_horas} h`),
                periodoCurso(curso) && h("span", {}, h("i", { class: "bi bi-calendar-event me-1" }), periodoCurso(curso)),
              ),
            ),
          ),
        ),
        h("td", {}, barraOcupacion(curso.inscriptos || 0, curso.cupo_maximo || 0)),
        h("td", { class: "text-center" }, h("span", { class: "me-gusta" }, h("i", { class: "bi bi-heart-fill" }), curso.likes_count || 0)),
        h("td", { class: "text-end text-nowrap" },
          h("a", { class: "btn btn-sm btn-outline-primary me-1", href: `alumnos_x_curso.html?id=${encodeURIComponent(curso.id)}` },
            h("i", { class: "bi bi-people-fill me-1" }), "Alumnos"),
          h("button", { type: "button", class: "btn btn-sm btn-icono btn-outline-secondary me-1", title: "Editar curso", "aria-label": "Editar curso", onClick: () => abrirModalEditarCurso(curso.id) },
            h("i", { class: "bi bi-pencil-square" })),
          h("button", { type: "button", class: "btn btn-sm btn-icono btn-outline-danger", title: "Eliminar curso", "aria-label": "Eliminar curso", onClick: () => eliminarCurso(curso.id) },
            h("i", { class: "bi bi-trash" })),
        ),
      ),
    ),
  );
}

async function eliminarCurso(id) {
  const curso = (window.__misCursos || []).find((c) => c.id === id);
  const confirmado = await confirmarAccion(
    `¿Seguro que deseas eliminar "${curso?.titulo || "este curso"}"? Esta acción no se puede deshacer.`,
    { titulo: "Eliminar curso", textoConfirmar: "Sí, eliminar" },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/cursos/${id}`, { method: "DELETE" });
  if (ok) {
    mostrarToast("Curso eliminado", "info");
    cargarTablaRepresentante();
  } else {
    mostrarToast(data.mensaje || "No se pudo eliminar el curso", "error");
  }
}

let cursoEditandoId = null;

async function cargarCategoriasEnSelect() {
  const selectCategoria = document.getElementById("cursoCategoria");
  if (!selectCategoria) return;

  selectCategoria.replaceChildren(h("option", { value: "" }, "Seleccionar..."));
  const { ok, data } = await apiFetch("/categorias", { auth: false });
  if (ok) {
    (data.categorias || []).forEach((cat) => selectCategoria.appendChild(h("option", { value: cat.id }, cat.nombre)));
  }
  selectCategoria.appendChild(h("option", { value: "__nueva__" }, "+ Agregar categoría nueva..."));
}

// ---------- Requisitos del curso ----------
// Cada curso tiene su propia lista (textos). No se muestra ninguna lista global:
// sólo estas sugerencias fijas para elegir rápido, y lo que el representante escriba.
// Nada se guarda hasta que se publica o guarda el curso.
const SUGERENCIAS_REQUISITOS = [
  "Ser mayor de 18 años",
  "Secundario completo",
  "Primario completo",
  "DNI vigente",
  "Conocimientos básicos de computación",
  "Traer notebook propia",
];
const MAX_REQUISITOS = 15;
let requisitosCurso = []; // Textos de los requisitos del curso que se está cargando

const normalizarRequisito = (texto) => String(texto || "").trim().replace(/\s+/g, " ");
const yaTieneRequisito = (texto) => requisitosCurso.some((r) => r.toLowerCase() === texto.toLowerCase());

function agregarRequisitoAlCurso(texto) {
  const limpio = normalizarRequisito(texto).slice(0, 255);
  if (limpio.length < 3) {
    mostrarToast("Escribí el requisito (al menos 3 letras)", "advertencia");
    return false;
  }
  if (yaTieneRequisito(limpio)) {
    mostrarToast("Ese requisito ya está en el curso", "info");
    return false;
  }
  if (requisitosCurso.length >= MAX_REQUISITOS) {
    mostrarToast(`Podés cargar hasta ${MAX_REQUISITOS} requisitos`, "advertencia");
    return false;
  }
  requisitosCurso.push(limpio);
  dibujarRequisitosCurso();
  return true;
}

function dibujarRequisitosCurso() {
  const contenedor = document.getElementById("cursoRequisitos");
  if (!contenedor) return;

  const elegidos = requisitosCurso.length
    ? requisitosCurso.map((texto, i) =>
        h("span", { class: "chip-requisito elegido" },
          h("i", { class: "bi bi-check2" }), texto,
          h("button", {
            type: "button",
            class: "chip-requisito-quitar",
            "aria-label": `Quitar requisito ${texto}`,
            onClick: () => {
              requisitosCurso.splice(i, 1);
              dibujarRequisitosCurso();
            },
          }, h("i", { class: "bi bi-x" })),
        ),
      )
    : [h("span", { class: "text-muted small" }, "Este curso todavía no tiene requisitos. Si no pide ninguno, dejalo así.")];

  const pendientes = SUGERENCIAS_REQUISITOS.filter((s) => !yaTieneRequisito(s));
  contenedor.replaceChildren(
    h("div", { class: "d-flex flex-wrap gap-2 w-100" }, elegidos),
    pendientes.length &&
      h("div", { class: "sugerencias-requisitos w-100" },
        h("span", { class: "sugerencias-titulo" }, h("i", { class: "bi bi-lightbulb me-1" }), "Sugerencias:"),
        pendientes.map((s) =>
          h("button", { type: "button", class: "chip-requisito sugerencia", onClick: () => agregarRequisitoAlCurso(s) },
            h("i", { class: "bi bi-plus-lg" }), s),
        ),
      ),
  );
}

// Escribir un requisito propio y sumarlo al curso
function prepararNuevoRequisito() {
  const campo = document.getElementById("nuevoRequisito");
  const boton = document.getElementById("btnAgregarRequisito");
  if (!campo || !boton) return;

  const agregar = () => {
    if (agregarRequisitoAlCurso(campo.value)) campo.value = "";
    campo.focus();
  };

  boton.addEventListener("click", agregar);
  // Enter en el campo agrega el requisito (en vez de enviar el formulario del curso)
  campo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregar();
    }
  });
}

// Carga en el modal los requisitos del curso (textos). Vacío al publicar uno nuevo.
async function cargarRequisitosEnFormulario(textos = []) {
  requisitosCurso = [];
  textos.map(normalizarRequisito).filter((t) => t.length >= 3).forEach((t) => {
    if (!yaTieneRequisito(t)) requisitosCurso.push(t);
  });
  dibujarRequisitosCurso();
}

// ==========================================
// REPRESENTANTE: equipo docente del curso (en el modal de publicar/editar)
// ==========================================
const MAX_DOCENTES = 20;
const MAX_BIO_DOCENTE = 1500;
// Cada docente: { nombre, cargo, biografia, foto_url (la que ya tenía guardada), archivo (foto nueva elegida), vista (URL para previsualizarla) }
let docentesCurso = [];

const inicialesDocente = (nombre) =>
  String(nombre || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";

function cargarDocentesEnFormulario(docentes = []) {
  docentesCurso.forEach((d) => d.vista && URL.revokeObjectURL(d.vista));
  docentesCurso = docentes.map((d) => ({
    nombre: d.nombre || "",
    cargo: d.cargo || "Profesor",
    biografia: d.biografia || "",
    foto_url: d.foto_url || null,
    archivo: null,
    vista: null,
  }));
  dibujarDocentesCurso();
}

function moverDocente(indice, salto) {
  const destino = indice + salto;
  if (destino < 0 || destino >= docentesCurso.length) return;
  [docentesCurso[indice], docentesCurso[destino]] = [docentesCurso[destino], docentesCurso[indice]];
  dibujarDocentesCurso();
}

function elegirFotoDocente(indice, archivo) {
  if (!archivo) return;
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return mostrarToast("La foto tiene que ser JPG, PNG o WEBP", "error");
  if (archivo.size > 3 * 1024 * 1024) return mostrarToast("La foto puede pesar hasta 3 MB", "error");
  const d = docentesCurso[indice];
  if (d.vista) URL.revokeObjectURL(d.vista);
  Object.assign(d, { archivo, vista: URL.createObjectURL(archivo) });
  dibujarDocentesCurso();
}

function quitarFotoDocente(indice) {
  const d = docentesCurso[indice];
  if (d.vista) URL.revokeObjectURL(d.vista);
  Object.assign(d, { archivo: null, vista: null, foto_url: null });
  dibujarDocentesCurso();
}

function filaDocente(d, i) {
  const idBase = `docente${i}`;
  const foto = d.vista || d.foto_url;
  const inputFoto = h("input", { type: "file", class: "visually-hidden", id: `${idBase}Foto`, accept: "image/png, image/jpeg, image/webp" });
  inputFoto.addEventListener("change", () => elegirFotoDocente(i, inputFoto.files[0]));
  const avatar = h("span", { class: "docente-form-avatar", "data-iniciales": inicialesDocente(d.nombre) },
    foto ? h("img", { src: foto, alt: "" }) : inicialesDocente(d.nombre));

  const campo = (clave, el) => {
    el.addEventListener("input", () => {
      d[clave] = el.value;
      if (clave === "nombre" && !foto) avatar.textContent = inicialesDocente(el.value);
      if (clave === "biografia") contador.textContent = `${el.value.length}/${MAX_BIO_DOCENTE}`;
    });
    return el;
  };
  const contador = h("span", { class: "form-text m-0" }, `${d.biografia.length}/${MAX_BIO_DOCENTE}`);

  return h("div", { class: "docente-form" },
    h("div", { class: "docente-form-foto" },
      h("label", { for: `${idBase}Foto`, class: "docente-form-elegir", title: "Elegir foto" }, avatar,
        h("span", { class: "docente-form-camara" }, h("i", { class: "bi bi-camera" }))),
      inputFoto,
      foto && h("button", { type: "button", class: "btn btn-link btn-sm p-0 text-danger", onClick: () => quitarFotoDocente(i) }, "Quitar foto"),
    ),
    h("div", { class: "docente-form-datos" },
      h("div", { class: "row g-2" },
        h("div", { class: "col-sm-6" },
          h("label", { class: "form-label small mb-1", for: `${idBase}Nombre` }, "Nombre y apellido *"),
          campo("nombre", h("input", { type: "text", class: "form-control form-control-sm", id: `${idBase}Nombre`, maxlength: "100", value: d.nombre, placeholder: "Ej: Ana Gómez" })),
        ),
        h("div", { class: "col-sm-6" },
          h("label", { class: "form-label small mb-1", for: `${idBase}Cargo` }, "Rol en el curso"),
          campo("cargo", h("input", { type: "text", class: "form-control form-control-sm", id: `${idBase}Cargo`, maxlength: "100", value: d.cargo, list: "sugerenciasCargoDocente", placeholder: "Profesor" })),
        ),
        h("div", { class: "col-12" },
          h("div", { class: "d-flex justify-content-between align-items-end" },
            h("label", { class: "form-label small mb-1", for: `${idBase}Bio` }, "Presentación (formación y experiencia)"),
            contador),
          campo("biografia", (() => {
            const t = h("textarea", { class: "form-control form-control-sm", id: `${idBase}Bio`, rows: "3", maxlength: String(MAX_BIO_DOCENTE), placeholder: "Ej: Analista de Sistemas con 10 años de experiencia en desarrollo web..." });
            t.value = d.biografia;
            return t;
          })()),
        ),
      ),
    ),
    h("div", { class: "docente-form-acciones" },
      h("button", { type: "button", class: "btn btn-sm btn-light", title: "Subir", "aria-label": "Mover arriba", disabled: i === 0 || undefined, onClick: () => moverDocente(i, -1) }, h("i", { class: "bi bi-arrow-up" })),
      h("button", { type: "button", class: "btn btn-sm btn-light", title: "Bajar", "aria-label": "Mover abajo", disabled: i === docentesCurso.length - 1 || undefined, onClick: () => moverDocente(i, 1) }, h("i", { class: "bi bi-arrow-down" })),
      h("button", { type: "button", class: "btn btn-sm btn-light text-danger", title: "Quitar docente", "aria-label": "Quitar docente", onClick: () => {
        if (d.vista) URL.revokeObjectURL(d.vista);
        docentesCurso.splice(i, 1);
        dibujarDocentesCurso();
      } }, h("i", { class: "bi bi-trash" })),
    ),
  );
}

function dibujarDocentesCurso() {
  const lista = document.getElementById("listaDocentesCurso");
  if (!lista) return;
  lista.replaceChildren(
    ...(docentesCurso.length
      ? docentesCurso.map(filaDocente)
      : [h("p", { class: "text-muted small mb-0" }, h("i", { class: "bi bi-person-video3 me-1" }), "Todavía no agregaste docentes.")]),
  );
  const boton = document.getElementById("btnAgregarDocente");
  if (boton) boton.disabled = docentesCurso.length >= MAX_DOCENTES;
}

function prepararEquipoDocente() {
  document.getElementById("btnAgregarDocente")?.addEventListener("click", () => {
    if (docentesCurso.length >= MAX_DOCENTES) return;
    docentesCurso.push({ nombre: "", cargo: "Profesor", biografia: "", foto_url: null, archivo: null, vista: null });
    dibujarDocentesCurso();
    document.getElementById(`docente${docentesCurso.length - 1}Nombre`)?.focus();
  });
  dibujarDocentesCurso();
}

// Agrega los docentes al formulario que se envía. Devuelve un texto de error si falta algo.
function agregarDocentesAlFormulario(formData) {
  const completos = docentesCurso.filter((d) => d.nombre.trim() || d.biografia.trim() || d.archivo || d.foto_url);
  const sinNombre = completos.findIndex((d) => !d.nombre.trim());
  if (sinNombre !== -1) return `Falta el nombre del docente ${sinNombre + 1}.`;
  let fotosNuevas = 0;
  const lista = completos.map((d) => {
    const item = { nombre: d.nombre.trim(), cargo: d.cargo.trim() || "Profesor", biografia: d.biografia.trim() };
    if (d.archivo) {
      formData.append("fotos_docentes", d.archivo);
      item.foto_nueva = fotosNuevas++;
    } else {
      item.foto_url = d.foto_url;
    }
    return item;
  });
  formData.append("docentes", JSON.stringify(lista));
  return null;
}

// ---------- Ubicación del curso ----------
// Cada curso tiene SU PROPIA ubicación (se guarda junto con el curso).
// Así, cambiar el lugar de un curso no cambia el de los demás.
let institucionUbicacion = null; // Ubicación vieja de la institución: sólo se usa para precargar cursos que todavía no tienen una propia

async function obtenerUbicacionInstitucion() {
  if (institucionUbicacion) return institucionUbicacion;
  const { ok, data } = await apiFetch("/auth/me");
  const inst = ok ? data.usuario?.institucion : null;
  institucionUbicacion = {
    ubicacion_maps: inst?.ubicacion_maps || "",
    latitud: inst?.latitud ?? null,
    longitud: inst?.longitud ?? null,
  };
  return institucionUbicacion;
}

// Lee coordenadas pegadas desde Google Maps. Acepta:
//   "-26.079947, -58.277096"  |  "-26.079947 -58.277096"
//   26°04'47.8"S 58°16'37.6"W (grados, minutos, segundos)
//   links de Google Maps con "@lat,lng", "q=lat,lng" o "!3dlat!4dlng"
// Devuelve { latitud, longitud } o null si no se entiende.
function leerCoordenadas(entrada) {
  const texto = String(entrada || "").trim();
  if (!texto) return null;
  const valido = (la, lo) =>
    Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180 && !(la === 0 && lo === 0)
      ? { latitud: Number(la.toFixed(7)), longitud: Number(lo.toFixed(7)) }
      : null;

  const g3d = texto.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (g3d) return valido(Number(g3d[1]), Number(g3d[2]));
  const enLink = texto.match(/[@=](-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (enLink) return valido(Number(enLink[1]), Number(enLink[2]));

  const gms = [...texto.matchAll(/(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)?\s*(?:["″]|'')?\s*([NSEOW])/gi)];
  if (gms.length === 2) {
    const aDecimal = (m) => {
      const v = Number(m[1]) + Number(m[2]) / 60 + Number(m[3] || 0) / 3600;
      return /[SWO]/i.test(m[4]) ? -v : v;
    };
    return valido(aDecimal(gms[0]), aDecimal(gms[1]));
  }

  const dec = texto.match(/^\(?\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*\)?$/);
  if (dec) return valido(Number(dec[1].replace(",", ".")), Number(dec[2].replace(",", ".")));
  return null;
}

let ubicacionTextoOriginal = ""; // Texto viejo de Google Maps del curso (sólo se conserva si el curso no tiene pin)

// Carga en el modal la ubicación del curso que se edita (o vacía si es un curso nuevo)
async function cargarUbicacionEnModal(curso = null) {
  const campo = document.getElementById("cursoCoordenadas");
  if (!campo) return;
  let ubic = { ubicacion_maps: "", latitud: null, longitud: null };
  if (curso) {
    const tienePropia = curso.ubicacion_maps || curso.latitud != null;
    ubic = tienePropia
      ? { ubicacion_maps: curso.ubicacion_maps || "", latitud: curso.latitud, longitud: curso.longitud }
      : await obtenerUbicacionInstitucion(); // Curso viejo sin ubicación propia: se precarga la que veían los alumnos
    if (cursoEditandoId !== curso.id) return; // Si mientras tanto se abrió otro curso, no pisa nada
  }
  let lat = ubic.latitud == null ? null : Number(ubic.latitud);
  let lng = ubic.longitud == null ? null : Number(ubic.longitud);
  ubicacionTextoOriginal = ubic.ubicacion_maps || "";
  if (lat == null) {
    // Cursos viejos que tenían coordenadas pegadas como texto: se convierten en pin
    const desdeTexto = leerCoordenadas(ubicacionTextoOriginal);
    if (desdeTexto) ({ latitud: lat, longitud: lng } = desdeTexto);
  }
  iniciarSelectorPin("cursoSelectorPin", lat, lng, (la, lo) => {
    document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(la, lo);
    // El campo de coordenadas siempre refleja dónde está el pin
    if (document.activeElement !== campo) campo.value = la == null ? "" : `${Number(la).toFixed(6)}, ${Number(lo).toFixed(6)}`;
  });
  campo.value = lat == null ? "" : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  campo.classList.remove("is-invalid", "is-valid");
  document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(lat, lng);
  setTimeout(() => {
    refrescarMapaLeaflet("cursoSelectorPin");
    if (lat != null) moverPin("cursoSelectorPin", lat, lng); // Centra el mapa en el pin una vez que el modal ya tiene tamaño
  }, 400);
}

// Cuando se pegan o escriben coordenadas, mueve el pin ahí
function prepararCampoCoordenadas() {
  const campo = document.getElementById("cursoCoordenadas");
  const ayuda = document.getElementById("cursoCoordenadasAyuda");
  if (!campo) return;
  const textoAyuda = ayuda?.textContent || "";
  const aplicar = () => {
    const texto = campo.value.trim();
    if (!texto) {
      campo.classList.remove("is-invalid", "is-valid");
      if (ayuda) ayuda.textContent = textoAyuda;
      return;
    }
    const coords = leerCoordenadas(texto);
    campo.classList.toggle("is-invalid", !coords);
    campo.classList.toggle("is-valid", !!coords);
    if (!coords) {
      if (ayuda) ayuda.textContent = "No entendemos esas coordenadas. Pegá algo como: -26.079947, -58.277096";
      return;
    }
    if (ayuda) ayuda.textContent = textoAyuda;
    moverPin("cursoSelectorPin", coords.latitud, coords.longitud);
  };
  campo.addEventListener("paste", () => setTimeout(aplicar, 0)); // Al pegar, se aplica enseguida
  campo.addEventListener("change", aplicar); // Al escribir y salir del campo (o Enter)
  campo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Que Enter no envíe el formulario del curso
      aplicar();
    }
  });
}

// Agrega la ubicación del curso al formulario que se envía (siempre, así también se puede borrar)
function agregarUbicacionAlFormulario(formData) {
  const pin = obtenerPin("cursoSelectorPin");
  // Si hay pin, el pin es la ubicación (se borra cualquier texto viejo de Google Maps).
  // Sin pin se conserva el texto viejo sólo si no eran coordenadas (ej. un mapa insertado de Google).
  const textoViejo = !pin && !leerCoordenadas(ubicacionTextoOriginal) ? ubicacionTextoOriginal : "";
  formData.append("ubicacion_maps", textoViejo);
  formData.append("latitud", pin ? String(pin.latitud) : "");
  formData.append("longitud", pin ? String(pin.longitud) : "");
}

// NUEVO: buscador de lugares con sugerencias; al elegir una, el pin se mueve ahí
function prepararBuscadorLugares() { // Se llama una vez al preparar el formulario
  const campo = document.getElementById("buscadorLugar"); // Campo de texto del buscador
  const lista = document.getElementById("sugerenciasLugar"); // Lista desplegable de sugerencias
  if (!campo || !lista) return; // Si el modal no tiene el buscador, no hace nada
  let temporizador = null; // Guarda el temporizador para esperar a que el usuario deje de escribir

  const ocultarLista = () => { lista.classList.add("d-none"); lista.innerHTML = ""; }; // Función que vacía y esconde la lista

  campo.addEventListener("input", () => { // Cada vez que el usuario escribe una letra...
    clearTimeout(temporizador); // ...cancela la búsqueda anterior pendiente
    const texto = campo.value.trim(); // Toma lo escrito sin espacios sobrantes
    if (texto.length < 3) { ocultarLista(); return; } // Con menos de 3 letras no busca
    temporizador = setTimeout(async () => { // Espera 600 ms sin escribir para no saturar al servicio (Nominatim pide máx. ~1 búsqueda por segundo)
      const { ok, data } = await apiFetch(`/lugares/buscar?q=${encodeURIComponent(texto)}`); // Pide las sugerencias al backend
      lista.innerHTML = ""; // Vacía la lista anterior
      if (!ok || !data.lugares?.length) { // Si no hubo resultados...
        const vacio = document.createElement("div"); // ...crea un aviso
        vacio.className = "list-group-item text-muted small"; // ...con estilo de item de lista
        vacio.textContent = ok ? "No está en el mapa gratuito. Buscalo en Google Maps, copiá las coordenadas y pegalas en el campo de abajo." : (data.mensaje || "No se pudo buscar el lugar"); // ...texto del aviso (textContent evita inyectar HTML)
        lista.appendChild(vacio); // ...lo agrega a la lista
        lista.classList.remove("d-none"); // ...y muestra la lista
        return; // ...y termina
      } // Cierra el if
      data.lugares.forEach((lugar) => { // Por cada lugar encontrado...
        const item = document.createElement("button"); // ...crea un botón
        item.type = "button"; // ...que no envía el formulario
        item.className = "list-group-item list-group-item-action small"; // ...con estilo de item clickeable
        const titulo = document.createElement("div"); // Nombre corto del lugar
        titulo.className = "fw-semibold";
        if (lugar.guardado) titulo.append(h("i", { class: "bi bi-bookmark-check-fill text-success me-1", title: "Lugar ya marcado en AllCursos" }));
        titulo.append(lugar.nombre);
        const detalle = document.createElement("div"); // Dirección completa, más chica
        detalle.className = "text-muted text-truncate";
        detalle.style.fontSize = "0.75rem";
        detalle.textContent = lugar.detalle || "";
        item.append(titulo, detalle);
        item.addEventListener("click", () => { // ...cuando el usuario lo elige...
          moverPin("cursoSelectorPin", lugar.latitud, lugar.longitud); // ...mueve el pin y centra el mapa en ese lugar
          campo.value = lugar.nombre; // ...deja el nombre elegido en el campo
          ocultarLista(); // ...y esconde la lista
        }); // Cierra el click
        lista.appendChild(item); // ...agrega el botón a la lista
      }); // Cierra el forEach
      lista.classList.remove("d-none"); // Muestra la lista con las sugerencias
    }, 600); // Cierra el temporizador (600 ms)
  }); // Cierra el listener input

  document.addEventListener("click", (e) => { // Cuando se hace clic en cualquier parte de la página...
    if (!lista.contains(e.target) && e.target !== campo) ocultarLista(); // ...si fue fuera del buscador, esconde la lista
  }); // Cierra el listener
} // Cierra la función

// ---------- Imagen del curso: vista previa + arrastrar y soltar ----------
function mostrarVistaPreviaImagen(src, titulo) {
  const img = document.getElementById("cursoImagenVistaPrevia");
  const zona = document.getElementById("zonaImagen");
  if (!img || !zona) return;
  img.classList.toggle("d-none", !src);
  if (src) img.src = src;
  else img.removeAttribute("src");
  zona.classList.toggle("con-imagen", !!src);
  document.getElementById("zonaImagenTitulo").textContent = titulo || "Elegí o arrastrá una imagen";
}

function prepararZonaImagen() {
  const input = document.getElementById("cursoImagen");
  const zona = document.getElementById("zonaImagen");
  if (!input || !zona) return;

  input.addEventListener("change", () => {
    const archivo = input.files[0];
    if (!archivo) return;
    if (archivo.size > 3 * 1024 * 1024) {
      mostrarToast("La imagen supera los 3 MB. Elegí una más liviana.", "error");
      input.value = "";
      return;
    }
    const lector = new FileReader();
    lector.onload = () => mostrarVistaPreviaImagen(lector.result, `${archivo.name} · cambiar imagen`);
    lector.readAsDataURL(archivo);
  });

  ["dragenter", "dragover"].forEach((evento) =>
    zona.addEventListener(evento, (e) => {
      e.preventDefault();
      zona.classList.add("arrastrando");
    }),
  );
  ["dragleave", "drop"].forEach((evento) => zona.addEventListener(evento, () => zona.classList.remove("arrastrando")));
  zona.addEventListener("drop", (e) => {
    e.preventDefault();
    const archivo = e.dataTransfer?.files?.[0];
    if (!archivo || !/^image\/(png|jpe?g|webp)$/.test(archivo.type)) {
      mostrarToast("Sólo se aceptan imágenes JPG, PNG o WEBP", "error");
      return;
    }
    const transferencia = new DataTransfer();
    transferencia.items.add(archivo);
    input.files = transferencia.files;
    input.dispatchEvent(new Event("change"));
  });
}

function actualizarContadorDescripcion() {
  const campo = document.getElementById("cursoDescripcion");
  const contador = document.getElementById("contadorDescripcion");
  if (campo && contador) contador.textContent = `${campo.value.length} / ${campo.maxLength}`;
}

// Fechas de cursado: la de fin no puede ser anterior a la de inicio, y se muestra cuánto dura
function actualizarFechasCurso() {
  const inicio = document.getElementById("cursoFechaInicio");
  const fin = document.getElementById("cursoFechaFin");
  const resumen = document.getElementById("resumenFechasCurso");
  if (!inicio || !fin || !resumen) return;
  // OJO: no se toca fin.min acá. Cambiarlo mientras el usuario escribe el año
  // (el navegador avisa "cambio" con años a medio escribir, ej. 0002) reinicia
  // el campo y borra la fecha. La validación inicio <= fin la hace el formulario.
  const anioCompleto = (valor) => Number(String(valor).slice(0, 4)) >= 1900; // Año ya escrito del todo
  const aviso = "Opcional. Cuando pase la fecha de finalización, te avisamos para que emitas los certificados a los alumnos que cumplieron.";
  let texto = aviso;
  let clase = "bi-info-circle";
  if (anioCompleto(inicio.value) && anioCompleto(fin.value)) {
    const dias = Math.round((new Date(fin.value) - new Date(inicio.value)) / 86400000) + 1;
    if (dias < 1) {
      texto = "La fecha de finalización no puede ser anterior a la de inicio.";
      clase = "bi-exclamation-triangle text-danger";
    } else {
      const semanas = Math.round(dias / 7);
      texto = `El curso dura ${dias} ${dias === 1 ? "día" : "días"}${semanas >= 2 ? ` (unas ${semanas} semanas)` : ""}. Al terminar, las inscripciones se finalizan solas.`;
      clase = "bi-calendar-range";
    }
  }
  resumen.replaceChildren(h("i", { class: `bi ${clase} me-1` }), texto);
}

function botonGuardando(boton, guardando, texto) {
  if (!boton) return;
  boton.disabled = guardando;
  if (guardando) {
    boton.dataset.textoOriginal = boton.innerHTML;
    boton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${texto}`;
  } else if (boton.dataset.textoOriginal) {
    boton.innerHTML = boton.dataset.textoOriginal;
  }
}

function resetearModalCurso() {
  cursoEditandoId = null;
  const form = document.getElementById("formNuevoCurso");
  form?.reset();
  document.getElementById("modalNuevoCursoLabel").textContent = "Publicar nuevo curso";
  document.getElementById("btnSubmitCurso").innerHTML = `<i class="bi bi-send me-1"></i>Publicar curso`;
  document.getElementById("cursoCategoriaNueva").classList.add("d-none");
  document.getElementById("cursoImagenActualWrap").classList.add("d-none");
  document.getElementById("msjNuevoCurso").replaceChildren();
  mostrarVistaPreviaImagen(null);
  actualizarContadorDescripcion();
  actualizarFechasCurso();
  cargarRequisitosEnFormulario([]);
  cargarDocentesEnFormulario([]);
  document.getElementById("buscadorLugar").value = ""; // Vacía el buscador al abrir el modal
  cargarUbicacionEnModal(null); // Curso nuevo: mapa vacío centrado en Formosa
}

// Se llama desde el botón "Editar" de cada fila de la tabla de cursos
async function abrirModalEditarCurso(id) {
  const curso = (window.__misCursos || []).find((c) => c.id === id);
  if (!curso) return;

  cursoEditandoId = id;
  document.getElementById("modalNuevoCursoLabel").textContent = `Editar curso: ${curso.titulo}`;
  document.getElementById("btnSubmitCurso").innerHTML = `<i class="bi bi-check2 me-1"></i>Guardar cambios`;
  document.getElementById("msjNuevoCurso").replaceChildren();

  document.getElementById("cursoTitulo").value = curso.titulo || "";
  document.getElementById("cursoDescripcion").value = curso.descripcion || "";
  document.getElementById("cursoModalidad").value = curso.modalidad || "Presencial";
  document.getElementById("cursoCupoMaximo").value = curso.cupo_maximo || "";
  document.getElementById("cursoDuracionHoras").value = curso.duracion_horas || "";
  document.getElementById("cursoCategoria").value = curso.categoria_id || "";
  document.getElementById("cursoCategoriaNueva").classList.add("d-none");
  document.getElementById("cursoImagen").value = "";
  document.getElementById("cursoFechaInicio").value = curso.fecha_inicio ? String(curso.fecha_inicio).slice(0, 10) : "";
  document.getElementById("cursoFechaFin").value = curso.fecha_fin ? String(curso.fecha_fin).slice(0, 10) : "";
  actualizarContadorDescripcion();
  actualizarFechasCurso();

  // La imagen actual se muestra dentro de la zona de carga
  document.getElementById("cursoImagenActualWrap").classList.toggle("d-none", !curso.imagen_url);
  mostrarVistaPreviaImagen(curso.imagen_url || null, curso.imagen_url ? "Imagen actual · cambiar imagen" : null);

  await cargarRequisitosEnFormulario((curso.requisitos || []).map((r) => r.descripcion));
  cargarDocentesEnFormulario(curso.docentes || []);
  document.getElementById("buscadorLugar").value = "";
  cargarUbicacionEnModal(curso); // Muestra la ubicación propia de este curso

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevoCurso")).show();
}

async function prepararFormularioNuevoCurso() {
  await cargarCategoriasEnSelect();
  await cargarRequisitosEnFormulario();
  prepararEquipoDocente();
  cargarUbicacionEnModal(null); // Mapa vacío centrado en Formosa
  prepararCampoCoordenadas(); // Pegar coordenadas de Google Maps mueve el pin

  const selectCategoria = document.getElementById("cursoCategoria");
  const inputCategoriaNueva = document.getElementById("cursoCategoriaNueva");
  selectCategoria.addEventListener("change", () => {
    const esNueva = selectCategoria.value === "__nueva__";
    inputCategoriaNueva.classList.toggle("d-none", !esNueva);
    if (esNueva) inputCategoriaNueva.focus();
  });

  document.getElementById("modalNuevoCurso").addEventListener("shown.bs.modal", () => refrescarMapaLeaflet("cursoSelectorPin")); // Al abrirse el modal, redibuja el mapa para que tome su tamaño real
  prepararBuscadorLugares(); // Activa el buscador de lugares con sugerencias
  prepararZonaImagen();
  document.getElementById("cursoDescripcion")?.addEventListener("input", actualizarContadorDescripcion);
  prepararNuevoRequisito();
  ["cursoFechaInicio", "cursoFechaFin"].forEach((id) => document.getElementById(id)?.addEventListener("change", actualizarFechasCurso));
  document.getElementById("btnQuitarPinCurso").addEventListener("click", () => quitarPin("cursoSelectorPin")); // El botón "Quitar pin" borra el pin

  // Los dos botones "Publicar" (cabecera y tarjeta) abren el modal vacío
  document.querySelectorAll(".js-nuevo-curso").forEach((boton) => boton.addEventListener("click", resetearModalCurso));

  const form = document.getElementById("formNuevoCurso");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msj = document.getElementById("msjNuevoCurso");
    const boton = document.getElementById("btnSubmitCurso");
    const mostrarError = (texto) => {
      msj.replaceChildren(h("div", { class: "alert alert-danger py-2 d-flex align-items-center gap-2" }, h("i", { class: "bi bi-exclamation-triangle-fill" }), texto));
      msj.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const fechaInicio = document.getElementById("cursoFechaInicio").value;
    const fechaFin = document.getElementById("cursoFechaFin").value;
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      mostrarError("La fecha de finalización no puede ser anterior a la de inicio.");
      return;
    }

    const editando = !!cursoEditandoId;
    botonGuardando(boton, true, editando ? "Guardando..." : "Publicando...");
    try {
      // Si eligió "crear categoría nueva", la creamos primero y usamos su id
      let categoriaId = selectCategoria.value;
      if (categoriaId === "__nueva__") {
        const nombreNueva = inputCategoriaNueva.value.trim();
        if (!nombreNueva) {
          mostrarError("Escribí el nombre de la nueva categoría.");
          return;
        }
        const { ok: okCat, data: dataCat } = await apiFetch("/categorias", {
          method: "POST",
          body: { nombre: nombreNueva },
        });
        if (!okCat) {
          mostrarError(dataCat.mensaje || "No se pudo crear la categoría");
          return;
        }
        categoriaId = dataCat.categoria.id;
      }


      const formData = new FormData();
      formData.append("titulo", document.getElementById("cursoTitulo").value.trim());
      formData.append("descripcion", document.getElementById("cursoDescripcion").value.trim());
      formData.append("categoria_id", categoriaId);
      formData.append("modalidad", document.getElementById("cursoModalidad").value);
      formData.append("cupo_maximo", document.getElementById("cursoCupoMaximo").value);
      formData.append("duracion_horas", document.getElementById("cursoDuracionHoras").value || "");
      // Se mandan siempre (vacías = sin fecha), así al editar también se pueden borrar
      formData.append("fecha_inicio", fechaInicio);
      formData.append("fecha_fin", fechaFin);
      // Siempre se manda (incluso vacío) para poder sacar requisitos al editar
      formData.append("requisitos", JSON.stringify(requisitosCurso)); // Textos de los requisitos de este curso
      agregarUbicacionAlFormulario(formData); // Ubicación propia de ESTE curso

      const archivoImagen = document.getElementById("cursoImagen").files[0];
      if (archivoImagen) formData.append("imagen", archivoImagen);

      // Equipo docente (siempre se manda, así al editar también se pueden sacar docentes)
      const errorDocentes = agregarDocentesAlFormulario(formData);
      if (errorDocentes) {
        mostrarError(errorDocentes);
        return;
      }

      const { ok, data } = await apiFetchForm(
        editando ? `/cursos/${cursoEditandoId}` : "/cursos",
        { method: editando ? "PUT" : "POST", formData },
      );

      if (ok) {
        bootstrap.Modal.getInstance(document.getElementById("modalNuevoCurso"))?.hide();
        mostrarToast(editando ? "Cambios guardados" : "¡Curso publicado!", "exito");
        resetearModalCurso();
        cargarCategoriasEnSelect();
        cargarTablaRepresentante();
      } else {
        mostrarError(data.mensaje || (data.errores ? data.errores.join(", ") : "No se pudo guardar el curso"));
      }
    } finally {
      botonGuardando(boton, false);
    }
  });
}

// ==========================================
// REPRESENTANTE: encuestas
// - "Para un curso" (Satisfaccion): sólo la ven los alumnos de ese curso.
// - "General" (Interes): la ven todos; tiene ideas de cursos para votar.
// - Duran hasta que el representante las finaliza o hasta una fecha.
// ==========================================
let ideasEncuesta = []; // Ideas de cursos cargadas en el modal: { titulo, origen: "nuevo"|"volver", curso_id? }

const hoyLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const cursoTerminado = (c) => !!c.fecha_fin && String(c.fecha_fin).slice(0, 10) < hoyLocalISO();

// Llena los selectores de cursos del modal: abiertos y terminados por separado
function cargarCursosEnModalEncuesta(cursos) {
  const selectCurso = document.getElementById("encuestaCurso");
  const selectVolver = document.getElementById("ideaVolverCurso");
  const abiertos = cursos.filter((c) => !cursoTerminado(c));
  const terminados = cursos.filter(cursoTerminado);
  const opcion = (c) =>
    h("option", { value: c.id }, c.titulo, c.fecha_fin ? ` (${cursoTerminado(c) ? "terminó" : "hasta"} el ${formatearDia(c.fecha_fin)})` : "");
  if (selectCurso) {
    selectCurso.replaceChildren(
      h("option", { value: "" }, cursos.length ? "Elegí el curso..." : "Todavía no tenés cursos publicados"),
      abiertos.length ? h("optgroup", { label: "Cursos abiertos (se están dictando)" }, abiertos.map(opcion)) : null,
      terminados.length ? h("optgroup", { label: "Cursos terminados" }, terminados.map(opcion)) : null,
    );
  }
  if (selectVolver) {
    selectVolver.replaceChildren(
      h("option", { value: "" }, "Traer de vuelta un curso..."),
      terminados.length ? h("optgroup", { label: "Cursos terminados" }, terminados.map((c) => h("option", { value: c.id }, c.titulo))) : null,
      abiertos.length ? h("optgroup", { label: "Otros cursos tuyos" }, abiertos.map((c) => h("option", { value: c.id }, c.titulo))) : null,
    );
  }
}

function dibujarIdeasEncuesta() {
  const lista = document.getElementById("listaIdeasEncuesta");
  if (!lista) return;
  if (ideasEncuesta.length === 0) {
    lista.replaceChildren(h("p", { class: "text-muted small mb-0" }, "Todavía no agregaste ideas."));
    return;
  }
  lista.replaceChildren(
    h("div", { class: "ideas-chips" },
      ideasEncuesta.map((idea, i) =>
        h("span", { class: `idea-chip ${idea.origen === "volver" ? "volver" : ""}` },
          h("i", { class: `bi ${idea.origen === "volver" ? "bi-arrow-repeat" : "bi-stars"}` }),
          idea.titulo,
          idea.origen === "volver" ? h("small", {}, "vuelve") : null,
          h("button", { type: "button", class: "idea-chip-quitar", title: "Quitar", "aria-label": `Quitar ${idea.titulo}`, onClick: () => { ideasEncuesta.splice(i, 1); dibujarIdeasEncuesta(); } },
            h("i", { class: "bi bi-x" })),
        ),
      ),
    ),
  );
}

function agregarIdeaEncuesta(idea) {
  const titulo = idea.titulo.trim();
  if (!titulo) return;
  if (ideasEncuesta.some((i) => i.titulo.toLowerCase() === titulo.toLowerCase())) {
    mostrarToast("Esa idea ya está en la lista", "advertencia");
    return;
  }
  if (ideasEncuesta.length >= 20) {
    mostrarToast("Podés cargar hasta 20 ideas", "advertencia");
    return;
  }
  ideasEncuesta.push({ ...idea, titulo });
  dibujarIdeasEncuesta();
}

function prepararFormularioNuevaEncuesta() {
  const radios = document.querySelectorAll('input[name="tipoEncuesta"]');
  const radiosDuracion = document.querySelectorAll('input[name="duracionEncuesta"]');
  const grupoCategoria = document.getElementById("grupoEncuestaCategoria");
  const grupoCurso = document.getElementById("grupoEncuestaCurso");
  const seccionIdeas = document.getElementById("seccionIdeasEncuesta");
  const grupoFecha = document.getElementById("grupoFechaCierre");
  const inputFecha = document.getElementById("encuestaFechaCierre");
  const tipoActual = () => document.querySelector('input[name="tipoEncuesta"]:checked').value;

  const actualizarVisibilidad = () => {
    const general = tipoActual() === "Interes";
    grupoCategoria.classList.toggle("d-none", !general);
    grupoCurso.classList.toggle("d-none", general);
    seccionIdeas.classList.toggle("d-none", !general);
    document.getElementById("numeroSeccionPreguntas").textContent = general ? "4" : "3";
    document.getElementById("tituloSeccionPreguntas").textContent = general ? "Preguntas (opcional)" : "Preguntas de la encuesta";
    document.getElementById("encuestaTitulo").placeholder = general
      ? "Ej: ¿Qué curso te gustaría que traigamos el año que viene?"
      : "Ej: ¿Cómo te está yendo en el curso?";
    EncuestaBuilder.setPermitirVacio(general);
  };
  const actualizarDuracion = () => {
    const conFecha = document.querySelector('input[name="duracionEncuesta"]:checked').value === "fecha";
    grupoFecha.classList.toggle("d-none", !conFecha);
    inputFecha.required = conFecha;
    inputFecha.min = hoyLocalISO();
  };

  const selectCategoria = document.getElementById("encuestaCategoria");
  if (selectCategoria) {
    apiFetch("/categorias", { auth: false }).then(({ ok, data }) => {
      if (ok) {
        (data.categorias || []).forEach((cat) => selectCategoria.appendChild(h("option", { value: cat.id }, cat.nombre)));
      }
    });
  }

  const form = document.getElementById("formNuevaEncuesta");
  if (!form) return;

  // Constructor dinámico de preguntas (selección múltiple / texto abierto / rating)
  EncuestaBuilder.init("#constructorPreguntas");
  radios.forEach((r) => r.addEventListener("change", actualizarVisibilidad));
  radiosDuracion.forEach((r) => r.addEventListener("change", actualizarDuracion));
  actualizarVisibilidad();
  actualizarDuracion();
  dibujarIdeasEncuesta();

  // Ideas de cursos: nuevas (texto) o traer de vuelta un curso propio
  const inputIdea = document.getElementById("nuevaIdeaEncuesta");
  const agregarIdeaNueva = () => {
    agregarIdeaEncuesta({ titulo: inputIdea.value, origen: "nuevo" });
    inputIdea.value = "";
    inputIdea.focus();
  };
  document.getElementById("btnAgregarIdea").addEventListener("click", agregarIdeaNueva);
  inputIdea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarIdeaNueva();
    }
  });
  document.getElementById("btnAgregarIdeaVolver").addEventListener("click", () => {
    const select = document.getElementById("ideaVolverCurso");
    if (!select.value) return mostrarToast("Elegí el curso que querés traer de vuelta", "advertencia");
    agregarIdeaEncuesta({ titulo: select.selectedOptions[0].textContent, origen: "volver", curso_id: Number(select.value) });
    select.value = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = tipoActual();
    const general = tipo === "Interes";
    const msj = document.getElementById("msjNuevaEncuesta");
    const avisar = (texto) => {
      msj.replaceChildren(h("div", { class: "alert alert-warning py-2" }, texto));
      msj.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const { errores, preguntas } = EncuestaBuilder.obtenerPreguntas();
    if (errores.length > 0) return avisar(errores[0]);
    if (!general && !document.getElementById("encuestaCurso").value) return avisar("Elegí el curso al que va dirigida la encuesta.");
    const conFecha = document.querySelector('input[name="duracionEncuesta"]:checked').value === "fecha";
    if (conFecha && !inputFecha.value) return avisar("Elegí hasta qué día se puede responder.");
    if (conFecha && inputFecha.value < hoyLocalISO()) return avisar("La fecha de cierre no puede ser anterior a hoy.");
    const permitePropuestas = document.getElementById("encuestaPermitePropuestas").checked;
    if (general && preguntas.length === 0 && ideasEncuesta.length === 0 && !permitePropuestas) {
      return avisar("Agregá ideas de cursos, alguna pregunta, o dejá que los estudiantes propongan ideas.");
    }

    const cuerpo = {
      titulo: document.getElementById("encuestaTitulo").value.trim(),
      descripcion: document.getElementById("encuestaDescripcion").value.trim(),
      tipo,
      categoria_id: general ? document.getElementById("encuestaCategoria").value || null : null,
      curso_id: general ? null : document.getElementById("encuestaCurso").value,
      fecha_cierre: conFecha ? inputFecha.value : null,
      ideas: general ? ideasEncuesta : [],
      permite_propuestas: general ? permitePropuestas : false,
      preguntas,
    };

    const boton = document.querySelector('#modalNuevaEncuesta button[type="submit"]');
    botonGuardando(boton, true, "Publicando...");
    const { ok, data } = await apiFetch("/encuestas", { method: "POST", body: cuerpo });
    botonGuardando(boton, false);

    if (ok) {
      form.reset();
      ideasEncuesta = [];
      dibujarIdeasEncuesta();
      actualizarVisibilidad();
      actualizarDuracion();
      EncuestaBuilder.reset();
      msj.replaceChildren();
      bootstrap.Modal.getInstance(document.getElementById("modalNuevaEncuesta"))?.hide();
      mostrarToast(general ? "Encuesta publicada para todos los estudiantes" : "Encuesta publicada para los alumnos del curso", "exito");
      cargarEncuestasRepresentante();
    } else {
      msj.replaceChildren(h("div", { class: "alert alert-danger py-2" }, data.mensaje || "No se pudo crear la encuesta"));
    }
  });
}

// Texto de vigencia: "Hasta que la finalices" / "Hasta el 20/12/2026" / "Finalizada"
function vigenciaEncuesta(enc) {
  if (!enc.vigente) return { clase: "cancelado", icono: "bi-lock", texto: "Finalizada", detalle: enc.fecha_cierre && String(enc.fecha_cierre).slice(0, 10) < hoyLocalISO() ? `Cerró el ${formatearDia(enc.fecha_cierre)}` : "La finalizaste" };
  if (enc.fecha_cierre) return { clase: "finalizado", icono: "bi-broadcast", texto: "Activa", detalle: `Hasta el ${formatearDia(enc.fecha_cierre)}` };
  return { clase: "finalizado", icono: "bi-broadcast", texto: "Activa", detalle: "Hasta que la finalices" };
}

async function cargarEncuestasRepresentante() {
  const contenedor = document.getElementById("listaEncuestasRepresentante");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/encuestas/mias");
  if (!ok) {
    contenedor.replaceChildren(h("p", { class: "text-danger small px-4 pb-3 mb-0" }, data.mensaje || "No se pudieron cargar tus encuestas"));
    return;
  }

  const encuestas = data.encuestas || [];
  actualizarMetrica("encuestas", encuestas.filter((e) => e.vigente).length);
  if (encuestas.length === 0) {
    contenedor.replaceChildren(
      h("div", { class: "panel-card-cuerpo" },
        estadoVacioPanel("bi-clipboard2-plus", "Todavía no creaste ninguna encuesta",
          "Preguntale a los alumnos de un curso cómo les va, o a todos qué curso quieren que traigas.",
          h("button", { type: "button", class: "btn btn-outline-primary btn-sm mt-3", "data-bs-toggle": "modal", "data-bs-target": "#modalNuevaEncuesta" },
            h("i", { class: "bi bi-plus-circle me-1" }), "Crear encuesta"))),
    );
    return;
  }

  // Activas primero
  encuestas.sort((a, b) => Number(b.vigente) - Number(a.vigente));

  contenedor.replaceChildren(
    h("div", { class: "table-responsive tabla-contenedor" },
      h("table", { class: "table align-middle tabla-panel" },
        h("thead", {}, h("tr", {}, h("th", {}, "Encuesta"), h("th", {}, "Para"), h("th", { class: "text-center" }, "Participación"), h("th", {}, "Vigencia"), h("th", { class: "text-end" }, "Acciones"))),
        h("tbody", {},
          encuestas.map((enc) => {
            const deCurso = enc.tipo === "Satisfaccion";
            const vigencia = vigenciaEncuesta(enc);
            return h("tr", { class: enc.vigente ? "" : "fila-encuesta-finalizada" },
              h("td", {},
                h("span", { class: "fw-semibold d-block" }, enc.titulo),
                !deCurso && enc.idea_top
                  ? h("span", { class: "small text-success" }, h("i", { class: "bi bi-trophy-fill me-1" }), `Más votada: ${enc.idea_top.titulo} (${enc.idea_top.votos})`)
                  : h("span", { class: "small text-muted" }, `Creada el ${formatearDia(enc.fecha_creacion)}`),
              ),
              h("td", {},
                h("span", { class: `tipo-chip ${deCurso ? "satisfaccion" : "interes"}` },
                  h("i", { class: `bi ${deCurso ? "bi-mortarboard-fill" : "bi-people-fill"}` }), deCurso ? "Alumnos del curso" : "Todos (general)"),
                deCurso && h("span", { class: "small text-muted d-block mt-1" }, enc.curso?.titulo || "-"),
              ),
              h("td", { class: "text-center" },
                h("span", { class: "respuestas-cantidad", title: "Respuestas" }, h("i", { class: "bi bi-people" }), enc.total_respuestas ?? 0),
                !deCurso && enc.total_ideas > 0
                  ? h("span", { class: "small text-muted d-block mt-1" }, `${enc.total_ideas} ideas · ${enc.total_votos} votos`)
                  : null,
              ),
              h("td", {},
                h("span", { class: `estado-chip ${vigencia.clase}` }, h("i", { class: `bi ${vigencia.icono}` }), vigencia.texto),
                h("span", { class: "small text-muted d-block mt-1" }, vigencia.detalle),
              ),
              h("td", { class: "text-end text-nowrap" },
                h("a", { class: "btn btn-sm btn-outline-primary me-1", href: `estadisticas_encuesta.html?id=${encodeURIComponent(enc.id)}` },
                  h("i", { class: "bi bi-bar-chart-line me-1" }), "Resultados"),
                enc.vigente && h("button", { type: "button", class: "btn btn-sm btn-outline-danger", title: "Finalizar encuesta", onClick: () => cerrarEncuesta(enc.id) },
                  h("i", { class: "bi bi-flag-fill me-1" }), "Finalizar"),
              ),
            );
          }),
        ),
      ),
    ),
  );
}

async function cerrarEncuesta(id) {
  const confirmado = await confirmarAccion(
    "Al finalizarla, los estudiantes dejan de verla y ya no se pueden enviar respuestas ni votos. Vos vas a seguir viendo los resultados.",
    { titulo: "¿Finalizar encuesta?", textoConfirmar: "Sí, finalizar", peligroso: false },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/encuestas/${id}/cerrar`, { method: "PUT" });
  if (ok) {
    mostrarToast("Encuesta finalizada", "info");
    cargarEncuestasRepresentante();
  } else {
    mostrarToast(data.mensaje || "No se pudo finalizar la encuesta", "error");
  }
}
