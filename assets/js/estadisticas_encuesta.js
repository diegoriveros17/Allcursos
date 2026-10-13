// assets/js/estadisticas_encuesta.js
// Panel de estadísticas de UNA encuesta (?id=...). Usa Chart.js para las preguntas de
// selección múltiple y valoración, y listas ordenables/filtrables para los textos abiertos.
// Requiere api.js, dom_utils.js y Chart.js.

const PALETA = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1", "#20c997", "#fd7e14", "#0dcaf0", "#6c757d", "#d63384", "#8540f5", "#795548"];
const graficos = new Map(); // preguntaId -> instancia de Chart (para destruirla al cambiar de tipo)

document.addEventListener("DOMContentLoaded", () => {
  const sesion = obtenerSesion();
  if (!sesion || sesion.rol !== "representante") {
    window.location.href = "login.html";
    return;
  }
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    window.location.href = "dashboard.html";
    return;
  }
  cargarEstadisticas(id);
});

async function cargarEstadisticas(id) {
  const cabecera = document.getElementById("cabeceraEncuesta");
  const cuerpo = document.getElementById("resultadosPreguntas");

  const { ok, data } = await apiFetch(`/encuestas/${id}/resultados`);
  if (!ok) {
    cabecera.replaceChildren(h("div", { class: "alert alert-danger" }, data.mensaje || "No se pudieron cargar las estadísticas"));
    cuerpo.replaceChildren();
    return;
  }

  graficos.forEach((g) => g.destroy());
  graficos.clear();

  const { encuesta, totalRespuestas, preguntas } = data;
  document.title = `Estadísticas: ${encuesta.titulo} - AllCursos`;

  cabecera.replaceChildren(
    h(
      "div",
      { class: "p-4 mb-4 bg-white rounded-3 shadow-sm border-start border-primary border-4" },
      h(
        "div",
        { class: "d-flex justify-content-between align-items-start flex-wrap gap-2" },
        h(
          "div",
          {},
          h("h2", { class: "mb-1" }, encuesta.titulo),
          h(
            "p",
            { class: "text-muted mb-0" },
            encuesta.tipo === "Satisfaccion" ? `Satisfacción · ${encuesta.curso?.titulo || ""}` : `Interés · ${encuesta.categoria?.nombre || "General"}`,
            " · Creada el ",
            formatearFecha(encuesta.fecha_creacion),
          ),
          encuesta.descripcion && h("p", { class: "mt-2 mb-0" }, encuesta.descripcion),
        ),
        h(
          "div",
          { class: "d-flex gap-2 flex-wrap" },
          h("button", { class: "btn btn-outline-secondary btn-sm", onClick: () => cargarEstadisticas(id) }, h("i", { class: "bi bi-arrow-clockwise me-1" }), "Actualizar"),
          encuesta.activo && h("button", { class: "btn btn-outline-danger btn-sm", onClick: () => cerrarDesdeEstadisticas(id) }, h("i", { class: "bi bi-lock me-1" }), "Cerrar encuesta"),
        ),
      ),
      h(
        "div",
        { class: "row g-3 mt-2" },
        tarjetaKpi("Respuestas recibidas", totalRespuestas, "bi-people-fill", "primary"),
        tarjetaKpi("Preguntas", preguntas.length, "bi-list-check", "success"),
        tarjetaKpi("Estado", encuesta.activo ? "Activa" : "Cerrada", encuesta.activo ? "bi-unlock" : "bi-lock", encuesta.activo ? "success" : "secondary"),
      ),
    ),
  );

  if (totalRespuestas === 0) {
    cuerpo.replaceChildren(h("div", { class: "alert alert-info" }, h("i", { class: "bi bi-info-circle me-2" }), "Todavía no hay respuestas. Los gráficos aparecerán apenas los estudiantes respondan."));
    return;
  }

  cuerpo.replaceChildren(...preguntas.map((p, i) => tarjetaPregunta(p, i + 1)));
  // Los gráficos se dibujan cuando el <canvas> ya está en el documento
  preguntas.forEach((p) => {
    if (p.tipo === "opcion_multiple") dibujarGrafico(p, "bar");
    else if (p.tipo === "rating") dibujarGrafico(p, "bar");
  });
}

function tarjetaKpi(titulo, valor, icono, color) {
  return h(
    "div",
    { class: "col-sm-4" },
    h(
      "div",
      { class: `border rounded p-3 d-flex align-items-center gap-3 bg-${color}-subtle` },
      h("i", { class: `bi ${icono} fs-3 text-${color}` }),
      h("div", {}, h("div", { class: "small text-muted" }, titulo), h("div", { class: "fs-4 fw-bold" }, valor)),
    ),
  );
}

async function cerrarDesdeEstadisticas(id) {
  const confirmado = await confirmarAccion("¿Cerrar esta encuesta? Ya no se podrán enviar más respuestas.", {
    titulo: "Cerrar encuesta",
    textoConfirmar: "Sí, cerrar",
    peligroso: false,
  });
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/encuestas/${id}/cerrar`, { method: "PUT" });
  if (ok) {
    mostrarToast("Encuesta cerrada", "info");
    cargarEstadisticas(id);
  } else {
    mostrarToast(data.mensaje || "No se pudo cerrar la encuesta", "error");
  }
}

// ------------------------------------------------------------
// Tarjeta de cada pregunta
// ------------------------------------------------------------
const ETIQUETA_TIPO = { opcion_multiple: "Selección múltiple", rating: "Valoración", texto_abierto: "Texto abierto" };

function tarjetaPregunta(p, numero) {
  const cabecera = h(
    "div",
    { class: "d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3" },
    h("h5", { class: "mb-0" }, `${numero}. ${p.texto}`),
    h("div", { class: "d-flex gap-2" }, h("span", { class: "badge text-bg-light border" }, ETIQUETA_TIPO[p.tipo]), h("span", { class: "badge text-bg-primary" }, `${p.total_respuestas} respuestas`)),
  );

  let contenido;
  if (p.tipo === "opcion_multiple") contenido = bloqueOpcionMultiple(p);
  else if (p.tipo === "rating") contenido = bloqueRating(p);
  else contenido = listaTextos(p.id, p.respuestas_texto, { titulo: "Respuestas escritas" });

  return h("div", { class: "card shadow-sm border-0 mb-4" }, h("div", { class: "card-body p-4" }, cabecera, contenido));
}

function bloqueOpcionMultiple(p) {
  const botones = h(
    "div",
    { class: "btn-group btn-group-sm mb-3", role: "group", "aria-label": "Tipo de gráfico" },
    [["bar", "bi-bar-chart-fill", "Barras"], ["pie", "bi-pie-chart-fill", "Torta"], ["doughnut", "bi-record-circle", "Dona"]].map(([tipo, icono, texto], i) =>
      h(
        "button",
        {
          type: "button",
          class: `btn ${i === 0 ? "btn-dark" : "btn-outline-dark"}`,
          onClick: (e) => {
            botones.querySelectorAll("button").forEach((b) => (b.className = "btn btn-outline-dark"));
            e.currentTarget.className = "btn btn-dark";
            dibujarGrafico(p, tipo);
          },
        },
        h("i", { class: `bi ${icono} me-1` }),
        texto,
      ),
    ),
  );

  const tabla = h(
    "table",
    { class: "table table-sm align-middle mb-0" },
    h("thead", {}, h("tr", {}, h("th", {}, "Opción"), h("th", { class: "text-end" }, "Votos"), h("th", { class: "text-end" }, "%"))),
    h(
      "tbody",
      {},
      p.opciones.map((o, i) =>
        h(
          "tr",
          {},
          h("td", {}, h("span", { class: "d-inline-block rounded-circle me-2", style: `width:10px;height:10px;background:${PALETA[i % PALETA.length]}` }), o.opcion),
          h("td", { class: "text-end" }, o.cantidad),
          h("td", { class: "text-end" }, `${o.porcentaje}%`),
        ),
      ),
    ),
  );

  return h(
    "div",
    {},
    botones,
    h(
      "div",
      { class: "row g-4" },
      h("div", { class: "col-lg-7" }, h("div", { class: "grafico-contenedor" }, h("canvas", { id: `grafico-${p.id}` }))),
      h("div", { class: "col-lg-5" }, tabla),
    ),
    p.justificaciones.length > 0 && h("div", { class: "mt-4" }, listaTextos(p.id, p.justificaciones, { titulo: "Justificaciones", conFiltro: true })),
  );
}

function bloqueRating(p) {
  return h(
    "div",
    {},
    h(
      "div",
      { class: "row g-4 align-items-center" },
      h(
        "div",
        { class: "col-lg-4 text-center" },
        h("div", { class: "display-3 fw-bold text-primary" }, p.promedio ?? "–"),
        h("div", { class: "text-muted" }, `promedio sobre ${p.escala_max}`),
        h("div", { class: "mt-2", "aria-label": `Promedio ${p.promedio} de ${p.escala_max}` }, estrellas(p.promedio, p.escala_max)),
      ),
      h("div", { class: "col-lg-8" }, h("div", { class: "grafico-contenedor" }, h("canvas", { id: `grafico-${p.id}` }))),
    ),
    p.justificaciones.length > 0 && h("div", { class: "mt-4" }, listaTextos(p.id, p.justificaciones, { titulo: "Justificaciones", conFiltro: true })),
  );
}

// Estrellas "de relleno proporcional" (se redondea a media estrella sobre una escala de 5)
function estrellas(promedio, max) {
  if (promedio == null) return null;
  const sobre5 = (promedio / max) * 5;
  return Array.from({ length: 5 }, (_, i) => {
    const icono = sobre5 >= i + 1 ? "bi-star-fill" : sobre5 >= i + 0.5 ? "bi-star-half" : "bi-star";
    return h("i", { class: `bi ${icono} text-warning fs-5` });
  });
}

// ------------------------------------------------------------
// Chart.js
// ------------------------------------------------------------
function dibujarGrafico(p, tipo) {
  const canvas = document.getElementById(`grafico-${p.id}`);
  if (!canvas || typeof Chart === "undefined") return;
  graficos.get(p.id)?.destroy();

  const esRating = p.tipo === "rating";
  const etiquetas = esRating ? p.distribucion.map((d) => String(d.valor)) : p.opciones.map((o) => o.opcion);
  const valores = esRating ? p.distribucion.map((d) => d.cantidad) : p.opciones.map((o) => o.cantidad);
  const total = valores.reduce((a, b) => a + b, 0) || 1;
  const circular = tipo === "pie" || tipo === "doughnut";

  graficos.set(
    p.id,
    new Chart(canvas, {
      type: tipo,
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: esRating ? "Cantidad de personas" : "Votos",
            data: valores,
            backgroundColor: circular ? etiquetas.map((_, i) => PALETA[i % PALETA.length]) : esRating ? "#0d6efd" : etiquetas.map((_, i) => PALETA[i % PALETA.length]),
            borderWidth: circular ? 2 : 0,
            borderColor: "#fff",
            borderRadius: circular ? 0 : 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Opción múltiple: barras horizontales (las etiquetas largas se leen mejor)
        indexAxis: !circular && !esRating ? "y" : "x",
        plugins: {
          legend: { display: circular, position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const cant = ctx.raw; // el valor real, sin importar si el gráfico es horizontal, vertical o circular
                return ` ${cant} ${cant === 1 ? "voto" : "votos"} (${Math.round((cant / total) * 100)}%)`;
              },
            },
          },
        },
        scales: circular
          ? {}
          : {
              [esRating ? "y" : "x"]: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Cantidad de personas" } },
              [esRating ? "x" : "y"]: esRating ? { title: { display: true, text: "Valoración" } } : {},
            },
      },
    }),
  );
}

// ------------------------------------------------------------
// Listas de texto (respuestas abiertas y justificaciones): ordenables, filtrables y buscables
// ------------------------------------------------------------
function listaTextos(preguntaId, items, { titulo, conFiltro = false } = {}) {
  if (!items || items.length === 0) {
    return h("p", { class: "text-muted mb-0" }, "Todavía no hay respuestas escritas.");
  }

  const estado = { orden: "recientes", busqueda: "", filtro: "" };
  const lista = h("div", { class: "list-group lista-scroll" });
  const contador = h("span", { class: "text-muted small" });

  const ordenadores = {
    recientes: (a, b) => new Date(b.fecha) - new Date(a.fecha),
    antiguas: (a, b) => new Date(a.fecha) - new Date(b.fecha),
    largas: (a, b) => b.texto.length - a.texto.length,
    cortas: (a, b) => a.texto.length - b.texto.length,
  };

  const pintar = () => {
    const texto = estado.busqueda.trim().toLowerCase();
    const visibles = items
      .filter((it) => (!estado.filtro || String(it.valor) === estado.filtro) && (!texto || it.texto.toLowerCase().includes(texto)))
      .sort(ordenadores[estado.orden]);
    contador.textContent = `Mostrando ${visibles.length} de ${items.length}`;
    lista.replaceChildren(
      ...(visibles.length
        ? visibles.map((it) =>
            h(
              "div",
              { class: "list-group-item" },
              h("div", { class: "d-flex justify-content-between gap-2 mb-1" }, it.valor != null ? h("span", { class: "badge text-bg-secondary" }, it.valor) : h("span"), h("span", { class: "small text-muted" }, formatearFecha(it.fecha))),
              h("div", { class: "texto-respuesta" }, it.texto),
            ),
          )
        : [h("div", { class: "list-group-item text-muted" }, "Ninguna respuesta coincide con el filtro.")]),
    );
  };

  const valoresFiltro = [...new Set(items.map((it) => it.valor).filter((v) => v != null))];

  const controles = h(
    "div",
    { class: "row g-2 mb-2" },
    h("div", { class: "col-md-4" }, h("input", { type: "search", class: "form-control form-control-sm", placeholder: "Buscar en las respuestas...", "aria-label": "Buscar", onInput: (e) => { estado.busqueda = e.target.value; pintar(); } })),
    h(
      "div",
      { class: "col-md-4" },
      h(
        "select",
        { class: "form-select form-select-sm", "aria-label": "Ordenar por", onChange: (e) => { estado.orden = e.target.value; pintar(); } },
        [["recientes", "Más recientes primero"], ["antiguas", "Más antiguas primero"], ["largas", "Más largas primero"], ["cortas", "Más cortas primero"]].map(([v, t]) => h("option", { value: v }, t)),
      ),
    ),
    conFiltro && valoresFiltro.length > 1
      ? h(
          "div",
          { class: "col-md-4" },
          h(
            "select",
            { class: "form-select form-select-sm", "aria-label": "Filtrar por opción", onChange: (e) => { estado.filtro = e.target.value; pintar(); } },
            h("option", { value: "" }, "Todas las opciones"),
            valoresFiltro.map((v) => h("option", { value: v }, v)),
          ),
        )
      : null,
  );

  pintar();
  return h("div", {}, h("div", { class: "d-flex justify-content-between align-items-center mb-2" }, h("h6", { class: "mb-0" }, titulo), contador), controles, lista);
}
