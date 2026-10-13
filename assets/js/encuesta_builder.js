// assets/js/encuesta_builder.js
// Constructor dinámico de preguntas para el modal "Nueva Encuesta" del representante.
// Tipos: selección múltiple, texto abierto y valoración (rating).
// Requiere dom_utils.js (función h).
const EncuestaBuilder = (() => {
  const TIPOS = {
    opcion_multiple: { etiqueta: "Selección múltiple", icono: "bi-ui-radios" },
    texto_abierto: { etiqueta: "Texto abierto", icono: "bi-chat-left-text" },
    rating: { etiqueta: "Valoración (rating)", icono: "bi-star-half" },
  };
  const ESCALAS = [3, 5, 7, 10];
  const PRESETS_OPCIONES = {
    "Bueno / Regular / Malo": ["Bueno", "Regular", "Malo"],
    "Sí / No": ["Sí", "No"],
    "De acuerdo / Neutral / En desacuerdo": ["De acuerdo", "Neutral", "En desacuerdo"],
  };
  const MAX_PREGUNTAS = 30;
  const MAX_OPCIONES = 12;

  let contenedor = null;
  let preguntas = [];
  let secuencia = 0;

  const nuevaPregunta = (tipo = "opcion_multiple") => ({
    uid: ++secuencia,
    texto: "",
    tipo,
    opciones: tipo === "opcion_multiple" ? ["Bueno", "Regular", "Malo"] : [],
    escala_max: 5,
    permite_justificacion: false,
    obligatoria: true,
  });

  function init(selector) {
    contenedor = typeof selector === "string" ? document.querySelector(selector) : selector;
    reset();
  }

  function reset() {
    preguntas = [nuevaPregunta("opcion_multiple")];
    render();
  }

  function mover(indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= preguntas.length) return;
    [preguntas[indice], preguntas[destino]] = [preguntas[destino], preguntas[indice]];
    render();
  }

  function tarjetaPregunta(p, indice) {
    const total = preguntas.length;

    const selectorTipo = h(
      "select",
      {
        class: "form-select",
        "aria-label": "Tipo de pregunta",
        onChange: (e) => {
          p.tipo = e.target.value;
          if (p.tipo === "opcion_multiple" && p.opciones.length === 0) p.opciones = ["Bueno", "Regular", "Malo"];
          if (p.tipo === "texto_abierto") p.permite_justificacion = false;
          render();
        },
      },
      Object.entries(TIPOS).map(([valor, t]) =>
        h("option", { value: valor, selected: p.tipo === valor }, t.etiqueta),
      ),
    );

    const cuerpoTipo = [];

    if (p.tipo === "opcion_multiple") {
      cuerpoTipo.push(
        h("label", { class: "form-label small fw-semibold mb-1" }, "Opciones (el estudiante elige una)"),
        ...p.opciones.map((op, i) =>
          h(
            "div",
            { class: "input-group input-group-sm mb-1" },
            h("span", { class: "input-group-text" }, i + 1),
            h("input", {
              type: "text",
              class: "form-control",
              maxlength: 150,
              placeholder: `Opción ${i + 1}`,
              value: op,
              onInput: (e) => (p.opciones[i] = e.target.value),
            }),
            h(
              "button",
              {
                type: "button",
                class: "btn btn-outline-danger",
                title: "Quitar opción",
                disabled: p.opciones.length <= 2,
                onClick: () => {
                  p.opciones.splice(i, 1);
                  render();
                },
              },
              h("i", { class: "bi bi-x-lg" }),
            ),
          ),
        ),
        h(
          "div",
          { class: "d-flex flex-wrap align-items-center gap-2 mt-1" },
          h(
            "button",
            {
              type: "button",
              class: "btn btn-sm btn-outline-secondary",
              disabled: p.opciones.length >= MAX_OPCIONES,
              onClick: () => {
                p.opciones.push("");
                render();
                // devolvemos el foco a la opción recién creada
                const inputs = contenedor.querySelectorAll(`[data-uid="${p.uid}"] input[placeholder^="Opción"]`);
                inputs[inputs.length - 1]?.focus();
              },
            },
            h("i", { class: "bi bi-plus-lg me-1" }),
            "Agregar opción",
          ),
          h(
            "div",
            { class: "dropdown" },
            h(
              "button",
              { type: "button", class: "btn btn-sm btn-link text-decoration-none", "data-bs-toggle": "dropdown" },
              "Usar plantilla",
            ),
            h(
              "ul",
              { class: "dropdown-menu" },
              Object.entries(PRESETS_OPCIONES).map(([nombre, opciones]) =>
                h(
                  "li",
                  {},
                  h(
                    "button",
                    {
                      type: "button",
                      class: "dropdown-item",
                      onClick: () => {
                        p.opciones = [...opciones];
                        render();
                      },
                    },
                    nombre,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    } else if (p.tipo === "rating") {
      cuerpoTipo.push(
        h(
          "div",
          { class: "row g-2 align-items-center" },
          h("label", { class: "col-auto small fw-semibold" }, "Escala de 1 a"),
          h(
            "div",
            { class: "col-auto" },
            h(
              "select",
              {
                class: "form-select form-select-sm",
                onChange: (e) => (p.escala_max = Number(e.target.value)),
              },
              ESCALAS.map((n) => h("option", { value: n, selected: p.escala_max === n }, n)),
            ),
          ),
          h("div", { class: "col text-muted small" }, "Ej: valorá el aprendizaje con el profesor (1 = muy malo, máximo = excelente)."),
        ),
      );
    } else {
      cuerpoTipo.push(
        h("div", { class: "text-muted small" }, "El estudiante escribe una respuesta libre (recomendaciones, críticas, sugerencias)."),
      );
    }

    const opcionesExtra = h(
      "div",
      { class: "d-flex flex-wrap gap-3 mt-3" },
      h(
        "div",
        { class: "form-check" },
        h("input", {
          class: "form-check-input",
          type: "checkbox",
          id: `obl-${p.uid}`,
          checked: p.obligatoria,
          onChange: (e) => (p.obligatoria = e.target.checked),
        }),
        h("label", { class: "form-check-label small", for: `obl-${p.uid}` }, "Obligatoria"),
      ),
      p.tipo !== "texto_abierto" &&
        h(
          "div",
          { class: "form-check" },
          h("input", {
            class: "form-check-input",
            type: "checkbox",
            id: `just-${p.uid}`,
            checked: p.permite_justificacion,
            onChange: (e) => (p.permite_justificacion = e.target.checked),
          }),
          h("label", { class: "form-check-label small", for: `just-${p.uid}` }, "Pedir justificación (campo de texto)"),
        ),
    );

    return h(
      "div",
      { class: "card mb-3", dataset: { uid: p.uid } },
      h(
        "div",
        { class: "card-header bg-light d-flex justify-content-between align-items-center py-2" },
        h("span", { class: "fw-semibold" }, h("i", { class: `bi ${TIPOS[p.tipo].icono} me-2` }), `Pregunta ${indice + 1}`),
        h(
          "div",
          { class: "btn-group btn-group-sm" },
          h("button", { type: "button", class: "btn btn-outline-secondary", title: "Subir", disabled: indice === 0, onClick: () => mover(indice, -1) }, h("i", { class: "bi bi-arrow-up" })),
          h("button", { type: "button", class: "btn btn-outline-secondary", title: "Bajar", disabled: indice === total - 1, onClick: () => mover(indice, 1) }, h("i", { class: "bi bi-arrow-down" })),
          h(
            "button",
            {
              type: "button",
              class: "btn btn-outline-danger",
              title: "Eliminar pregunta",
              disabled: total === 1,
              onClick: () => {
                preguntas.splice(indice, 1);
                render();
              },
            },
            h("i", { class: "bi bi-trash" }),
          ),
        ),
      ),
      h(
        "div",
        { class: "card-body" },
        h(
          "div",
          { class: "row g-2 mb-3" },
          h(
            "div",
            { class: "col-md-8" },
            h("input", {
              type: "text",
              class: "form-control",
              maxlength: 300,
              placeholder: "Ej: ¿Qué tal te parece el curso?",
              "aria-label": "Texto de la pregunta",
              value: p.texto,
              onInput: (e) => (p.texto = e.target.value),
            }),
          ),
          h("div", { class: "col-md-4" }, selectorTipo),
        ),
        cuerpoTipo,
        opcionesExtra,
      ),
    );
  }

  function render() {
    if (!contenedor) return;
    contenedor.replaceChildren(
      ...preguntas.map(tarjetaPregunta),
      h(
        "div",
        { class: "d-flex flex-wrap gap-2" },
        ...Object.entries(TIPOS).map(([tipo, t]) =>
          h(
            "button",
            {
              type: "button",
              class: "btn btn-sm btn-outline-primary",
              disabled: preguntas.length >= MAX_PREGUNTAS,
              onClick: () => {
                preguntas.push(nuevaPregunta(tipo));
                render();
              },
            },
            h("i", { class: `bi ${t.icono} me-1` }),
            `Agregar: ${t.etiqueta}`,
          ),
        ),
      ),
    );
  }

  // Devuelve { errores, preguntas } listo para mandar al backend.
  // El backend vuelve a validar todo; esto es sólo para avisar antes y con claridad.
  function obtenerPreguntas() {
    const errores = [];
    const limpias = preguntas.map((p, i) => {
      const n = i + 1;
      const texto = p.texto.trim();
      if (!texto) errores.push(`La pregunta ${n} no tiene texto`);
      const salida = {
        texto,
        tipo: p.tipo,
        obligatoria: p.obligatoria,
        permite_justificacion: p.tipo === "texto_abierto" ? false : p.permite_justificacion,
      };
      if (p.tipo === "opcion_multiple") {
        salida.opciones = [...new Set(p.opciones.map((o) => o.trim()).filter(Boolean))];
        if (salida.opciones.length < 2) errores.push(`La pregunta ${n} necesita al menos 2 opciones distintas`);
      }
      if (p.tipo === "rating") salida.escala_max = p.escala_max;
      return salida;
    });
    return { errores, preguntas: limpias };
  }

  return { init, reset, obtenerPreguntas };
})();
