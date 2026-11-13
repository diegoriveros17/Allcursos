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
    h("span", { class: "panel-chip" }, h("i", { class: `bi ${esRepresentante ? "bi-building" : "bi-mortarboard"} me-1` }), esRepresentante ? "Representante" : "Ciudadano"),
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
      h("span", { class: "rol-chip" }, h("i", { class: "bi bi-mortarboard me-1" }), "Ciudadano"),
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
  { clave: "cancelados", texto: "Cancelados", estados: ["Cancelado"] },
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
  const finalizados = cuenta(["Finalizado"]);
  actualizarMetrica("activos", activos);
  actualizarMetrica("finalizados", finalizados);
  dibujarProgreso(finalizados, activos + finalizados);

  dibujarFiltrosMisCursos();
  dibujarMisCursos();
  dibujarListaEspera(data.listaEspera || []);
}

function dibujarProgreso(finalizados, total) {
  const anillo = document.getElementById("anilloProgreso");
  const texto = document.getElementById("textoProgreso");
  if (!anillo || !texto) return;
  const porcentaje = total ? Math.round((finalizados / total) * 100) : 0;
  anillo.style.setProperty("--p", porcentaje);
  document.getElementById("anilloProgresoTexto").textContent = `${porcentaje}%`;
  texto.textContent = total
    ? `Terminaste ${finalizados} de ${total} ${total === 1 ? "curso" : "cursos"}. ${porcentaje === 100 ? "¡Excelente trabajo!" : "¡Seguí así!"}`
    : "Inscribite a un curso para empezar.";
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

// Pasos del cursado: Inscripto → Cursando → Finalizado
function pasosDelCurso(estado) {
  const pasos = ["Inscripto", "Cursando", "Finalizado"];
  const actual = pasos.indexOf(estado);
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
  if (item.estado === "Finalizado") {
    acciones.push(h("button", { type: "button", class: "btn btn-sm btn-success", onClick: (e) => descargarCertificado(item.id, e.currentTarget) },
      h("i", { class: "bi bi-file-earmark-arrow-down me-1" }), "Certificado"));
  }
  acciones.push(h("a", { href: enlace, class: "btn btn-sm btn-outline-primary" }, "Ver curso"));
  if (item.estado !== "Finalizado" && item.estado !== "Cancelado") {
    acciones.push(h("button", { type: "button", class: "btn btn-sm btn-link text-danger text-decoration-none", onClick: () => cancelarInscripcion(item.id) }, "Cancelar"));
  }

  let avance;
  if (item.estado === "Cancelado") avance = h("p", { class: "mi-curso-aviso" }, h("i", { class: "bi bi-info-circle me-1" }), "Cancelaste esta inscripción.");
  else if (item.estado === "En espera") avance = h("p", { class: "mi-curso-aviso" }, h("i", { class: "bi bi-hourglass-split me-1" }), "Tu inscripción está pendiente de confirmación.");
  else avance = pasosDelCurso(item.estado);

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
        h("span", { class: `estado-chip ${estilo.clase}` }, h("i", { class: `bi ${estilo.icono}` }), item.estado),
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

async function cancelarInscripcion(id) {
  const confirmado = await confirmarAccion("¿Seguro que deseas cancelar esta inscripción? Vas a liberar tu lugar en el curso.", {
    titulo: "Cancelar inscripción",
    textoConfirmar: "Sí, cancelar",
  });
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/inscripciones/${id}`, {
    method: "PUT",
    body: { estado: "Cancelado" },
  });
  if (ok) {
    mostrarToast("Inscripción cancelada", "info");
    cargarTablaCiudadano();
  } else {
    mostrarToast(data.mensaje || "No se pudo cancelar la inscripción", "error");
  }
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

  // Recargamos las opciones de "curso a evaluar" del modal de encuestas
  const selectCurso = document.getElementById("encuestaCurso");
  if (selectCurso) {
    selectCurso.replaceChildren(
      h("option", { value: "" }, "Seleccionar..."),
      ...cursos.map((c) => h("option", { value: c.id }, c.titulo)),
    );
  }
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

// Requisitos como "chips" que se marcan y desmarcan con un clic
async function cargarRequisitosEnFormulario(idsSeleccionados = []) {
  const contenedorRequisitos = document.getElementById("cursoRequisitos");
  if (!contenedorRequisitos) return;

  const { ok, data } = await apiFetch("/requisitos", { auth: false });
  if (!ok) return;

  const requisitos = data.requisitos || [];
  if (!requisitos.length) {
    contenedorRequisitos.replaceChildren(h("p", { class: "text-muted small mb-0" }, "Todavía no hay requisitos cargados en el sistema."));
    return;
  }
  contenedorRequisitos.replaceChildren(
    ...requisitos.map((r) => [
      h("input", { type: "checkbox", class: "btn-check", value: r.id, id: `req-${r.id}`, autocomplete: "off", checked: idsSeleccionados.includes(r.id) }),
      h("label", { class: "chip-requisito", for: `req-${r.id}` }, h("i", { class: "bi bi-plus-lg" }), r.descripcion),
    ]),
  );
}

let institucionIdModal = null; // NUEVO: id de la institución del representante (para guardar su ubicación)
let ubicacionGuardada = ""; // NUEVO: texto de ubicación que ya estaba guardado (para saber si el usuario lo cambió)
let pinGuardado = null; // NUEVO: pin que ya estaba guardado { latitud, longitud } o null (para saber si lo cambió)

// NUEVO: carga la ubicación guardada de la institución y dibuja su mapa en el modal
async function cargarUbicacionEnModal() { // Función async porque consulta al backend
  const campo = document.getElementById("cursoUbicacionMaps"); // Busca el campo de texto de la ubicación
  if (!campo) return; // Si el modal no tiene el campo, no hace nada
  const { ok, data } = await apiFetch("/auth/me"); // Pide los datos del usuario logueado (incluye su institución)
  if (!ok || !data.usuario?.institucion) return; // Si falló o no tiene institución, corta
  institucionIdModal = data.usuario.institucion.id; // Guarda el id de la institución
  ubicacionGuardada = data.usuario.institucion.ubicacion_maps || ""; // Guarda el texto de ubicación actual
  campo.value = ubicacionGuardada; // Lo muestra en el campo
  const inst = data.usuario.institucion; // Atajo a los datos de la institución
  pinGuardado = inst.latitud != null ? { latitud: inst.latitud, longitud: inst.longitud } : null; // Recuerda el pin guardado (o null si no hay)
  iniciarSelectorPin("cursoSelectorPin", inst.latitud, inst.longitud, (la, lo) => { // Crea el mapa con pin y define qué hacer cuando cambia
    document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(la, lo); // Actualiza el texto de coordenadas
  }); // Cierra la llamada
  document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(inst.latitud, inst.longitud); // Muestra las coordenadas iniciales
  setTimeout(() => refrescarMapaLeaflet("cursoSelectorPin"), 400); // Redibuja el mapa por si el modal todavía se estaba abriendo (tamaño 0)
  const respuesta = await apiFetch(`/instituciones/${institucionIdModal}/ubicacion`, { auth: false }); // Pide la URL segura del mapa
  mostrarMapa("cursoMapaPreview", respuesta.ok ? respuesta.data.mapa_embed_url : null); // Dibuja el mapa (o el aviso si no hay)
} // Cierra la función

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
        vacio.textContent = ok ? "No encontramos ese lugar. Probá con otra dirección o marcá el punto en el mapa." : (data.mensaje || "No se pudo buscar el lugar"); // ...texto del aviso (textContent evita inyectar HTML)
        lista.appendChild(vacio); // ...lo agrega a la lista
        lista.classList.remove("d-none"); // ...y muestra la lista
        return; // ...y termina
      } // Cierra el if
      data.lugares.forEach((lugar) => { // Por cada lugar encontrado...
        const item = document.createElement("button"); // ...crea un botón
        item.type = "button"; // ...que no envía el formulario
        item.className = "list-group-item list-group-item-action small"; // ...con estilo de item clickeable
        item.textContent = lugar.nombre; // ...mostrando el nombre del lugar (textContent evita inyectar HTML)
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

// NUEVO: si el representante cambió la ubicación, la guarda; devuelve true si todo salió bien
async function guardarUbicacionDelModal() { // Función async porque llama al backend
  const campo = document.getElementById("cursoUbicacionMaps"); // Busca el campo de texto
  if (!campo || !institucionIdModal) return true; // Sin campo o sin institución no hay nada que guardar
  const texto = campo.value.trim(); // Lee el texto sin espacios sobrantes
  const pin = obtenerPin("cursoSelectorPin"); // Lee el pin actual del mapa (o null)
  const pinCambio = (pin?.latitud ?? null) !== (pinGuardado?.latitud ?? null) || (pin?.longitud ?? null) !== (pinGuardado?.longitud ?? null); // Compara con el pin guardado
  if (texto === ubicacionGuardada.trim() && !pinCambio) return true; // Si ni el texto ni el pin cambiaron, no hace falta llamar al backend
  const { ok, data } = await apiFetch(`/instituciones/${institucionIdModal}/ubicacion`, { // Llama al PUT de ubicación
    method: "PUT", // Método PUT porque actualiza un dato
    body: { ubicacion_maps: texto, latitud: pin?.latitud ?? null, longitud: pin?.longitud ?? null }, // Envía el texto escrito y el pin (null si no hay)
  }); // Cierra la llamada
  if (!ok) { // Si el backend rechazó la ubicación...
    document.getElementById("msjNuevoCurso").innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo guardar la ubicación"}</div>`; // ...muestra el error dentro del modal
    return false; // ...e indica que hubo un problema
  } // Cierra el if
  ubicacionGuardada = texto; // Recuerda el nuevo texto guardado
  pinGuardado = pin; // Recuerda el nuevo pin guardado
  mostrarMapa("cursoMapaPreview", data.mapa_embed_url); // Actualiza el mapa del modal
  return true; // Todo salió bien
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
  const aviso = "Opcional. Cuando pase la fecha de finalización, las inscripciones se finalizan solas y los alumnos pueden descargar su certificado.";
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
  document.getElementById("buscadorLugar").value = ""; // Vacía el buscador al abrir el modal
  cargarUbicacionEnModal(); // Precarga la ubicación guardada y su mapa
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

  const idsRequisitos = (curso.requisitos || []).map((r) => r.id);
  await cargarRequisitosEnFormulario(idsRequisitos);
  cargarUbicacionEnModal(); // También al editar un curso, muestra la ubicación de la institución

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevoCurso")).show();
}

async function prepararFormularioNuevoCurso() {
  await cargarCategoriasEnSelect();
  await cargarRequisitosEnFormulario();
  cargarUbicacionEnModal(); // Precarga la ubicación al preparar el formulario

  const selectCategoria = document.getElementById("cursoCategoria");
  const inputCategoriaNueva = document.getElementById("cursoCategoriaNueva");
  selectCategoria.addEventListener("change", () => {
    const esNueva = selectCategoria.value === "__nueva__";
    inputCategoriaNueva.classList.toggle("d-none", !esNueva);
    if (esNueva) inputCategoriaNueva.focus();
  });

  document.getElementById("modalNuevoCurso").addEventListener("shown.bs.modal", () => refrescarMapaLeaflet("cursoSelectorPin")); // Al abrirse el modal, redibuja el mapa para que tome su tamaño real
  document.querySelector("#modalNuevoCurso details.detalle-alternativa")?.addEventListener("toggle", () => refrescarMapaLeaflet("cursoSelectorPin"));
  prepararBuscadorLugares(); // Activa el buscador de lugares con sugerencias
  prepararZonaImagen();
  document.getElementById("cursoDescripcion")?.addEventListener("input", actualizarContadorDescripcion);
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

      if (!(await guardarUbicacionDelModal())) return; // Guarda la ubicación primero; si falla, no sigue con el curso

      const requisitosSeleccionados = Array.from(
        document.querySelectorAll('#cursoRequisitos input[type="checkbox"]:checked'),
      ).map((chk) => Number(chk.value));

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
      formData.append("requisitos", JSON.stringify(requisitosSeleccionados));

      const archivoImagen = document.getElementById("cursoImagen").files[0];
      if (archivoImagen) formData.append("imagen", archivoImagen);

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
// ==========================================
function prepararFormularioNuevaEncuesta() {
  const radios = document.querySelectorAll('input[name="tipoEncuesta"]');
  const grupoCategoria = document.getElementById("grupoEncuestaCategoria");
  const grupoCurso = document.getElementById("grupoEncuestaCurso");

  const actualizarVisibilidad = () => {
    const tipo = document.querySelector('input[name="tipoEncuesta"]:checked').value;
    grupoCategoria.classList.toggle("d-none", tipo !== "Interes");
    grupoCurso.classList.toggle("d-none", tipo !== "Satisfaccion");
  };
  radios.forEach((r) => r.addEventListener("change", actualizarVisibilidad));
  actualizarVisibilidad();

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = document.querySelector('input[name="tipoEncuesta"]:checked').value;
    const msj = document.getElementById("msjNuevaEncuesta");

    const { errores, preguntas } = EncuestaBuilder.obtenerPreguntas();
    if (errores.length > 0) {
      msj.replaceChildren(h("div", { class: "alert alert-warning py-2" }, errores[0]));
      msj.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const cuerpo = {
      titulo: document.getElementById("encuestaTitulo").value.trim(),
      descripcion: document.getElementById("encuestaDescripcion").value.trim(),
      tipo,
      categoria_id: tipo === "Interes" ? document.getElementById("encuestaCategoria").value || null : null,
      curso_id: tipo === "Satisfaccion" ? document.getElementById("encuestaCurso").value : null,
      preguntas,
    };

    const boton = document.querySelector('#modalNuevaEncuesta button[type="submit"]');
    botonGuardando(boton, true, "Publicando...");
    const { ok, data } = await apiFetch("/encuestas", { method: "POST", body: cuerpo });
    botonGuardando(boton, false);

    if (ok) {
      form.reset();
      actualizarVisibilidad();
      EncuestaBuilder.reset();
      msj.replaceChildren();
      bootstrap.Modal.getInstance(document.getElementById("modalNuevaEncuesta"))?.hide();
      mostrarToast("Encuesta publicada", "exito");
      cargarEncuestasRepresentante();
    } else {
      msj.replaceChildren(h("div", { class: "alert alert-danger py-2" }, data.mensaje || "No se pudo crear la encuesta"));
    }
  });
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
  actualizarMetrica("encuestas", encuestas.filter((e) => e.activo).length);
  if (encuestas.length === 0) {
    contenedor.replaceChildren(
      h("div", { class: "panel-card-cuerpo" },
        estadoVacioPanel("bi-clipboard2-plus", "Todavía no creaste ninguna encuesta",
          "Las encuestas te ayudan a saber qué cursos ofrecer y cómo mejorarlos.",
          h("button", { type: "button", class: "btn btn-outline-primary btn-sm mt-3", "data-bs-toggle": "modal", "data-bs-target": "#modalNuevaEncuesta" },
            h("i", { class: "bi bi-plus-circle me-1" }), "Crear encuesta"))),
    );
    return;
  }

  contenedor.replaceChildren(
    h("div", { class: "table-responsive tabla-contenedor" },
      h("table", { class: "table align-middle tabla-panel" },
        h("thead", {}, h("tr", {}, h("th", {}, "Encuesta"), h("th", {}, "Tipo"), h("th", { class: "text-center" }, "Respuestas"), h("th", {}, "Estado"), h("th", { class: "text-end" }, "Acciones"))),
        h("tbody", {},
          encuestas.map((enc) => {
            const satisfaccion = enc.tipo === "Satisfaccion";
            return h("tr", {},
              h("td", {},
                h("span", { class: "fw-semibold d-block" }, enc.titulo),
                h("span", { class: "small text-muted" }, satisfaccion ? `Curso: ${enc.curso?.titulo || "-"}` : `Categoría: ${enc.categoria?.nombre || "General"}`),
              ),
              h("td", {},
                h("span", { class: `tipo-chip ${satisfaccion ? "satisfaccion" : "interes"}` },
                  h("i", { class: `bi ${satisfaccion ? "bi-star-fill" : "bi-lightbulb-fill"}` }), satisfaccion ? "Satisfacción" : "Interés"),
              ),
              h("td", { class: "text-center" }, h("span", { class: "respuestas-cantidad" }, h("i", { class: "bi bi-people" }), enc.total_respuestas ?? 0)),
              h("td", {},
                h("span", { class: `estado-chip ${enc.activo ? "finalizado" : "cancelado"}` },
                  h("i", { class: `bi ${enc.activo ? "bi-broadcast" : "bi-lock"}` }), enc.activo ? "Activa" : "Cerrada"),
              ),
              h("td", { class: "text-end text-nowrap" },
                h("a", { class: "btn btn-sm btn-outline-primary me-1", href: `estadisticas_encuesta.html?id=${encodeURIComponent(enc.id)}` },
                  h("i", { class: "bi bi-bar-chart-line me-1" }), "Estadísticas"),
                enc.activo && h("button", { type: "button", class: "btn btn-sm btn-icono btn-outline-secondary", title: "Cerrar encuesta", "aria-label": "Cerrar encuesta", onClick: () => cerrarEncuesta(enc.id) },
                  h("i", { class: "bi bi-lock" })),
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
    "¿Cerrar esta encuesta? Ya no se podrán enviar más respuestas.",
    { titulo: "Cerrar encuesta", textoConfirmar: "Sí, cerrar", peligroso: false },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/encuestas/${id}/cerrar`, { method: "PUT" });
  if (ok) {
    mostrarToast("Encuesta cerrada", "info");
    cargarEncuestasRepresentante();
  } else {
    mostrarToast(data.mensaje || "No se pudo cerrar la encuesta", "error");
  }
}
