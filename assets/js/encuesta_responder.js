// assets/js/encuesta_responder.js
// Lado del ciudadano: muestra las encuestas activas con sus preguntas dinámicas
// (selección múltiple, valoración, texto abierto) y envía las respuestas.
// Requiere api.js y dom_utils.js.

function crearCampoPregunta(p, encuestaId) {
  const nombre = `e${encuestaId}-p${p.id}`;
  const requerido = !!p.obligatoria;
  const titulo = h(
    "label",
    { class: "form-label fw-semibold mb-1 d-block" },
    p.texto,
    requerido ? h("span", { class: "text-danger ms-1", title: "Obligatoria" }, "*") : h("span", { class: "text-muted fw-normal ms-1 small" }, "(opcional)"),
  );

  let control;

  if (p.tipo === "opcion_multiple") {
    control = h(
      "div",
      {},
      p.opciones.map((op, i) =>
        h(
          "div",
          { class: "form-check" },
          h("input", { class: "form-check-input", type: "radio", name: nombre, id: `${nombre}-${i}`, value: op, required: requerido }),
          h("label", { class: "form-check-label", for: `${nombre}-${i}` }, op),
        ),
      ),
    );
  } else if (p.tipo === "rating") {
    control = h(
      "div",
      {},
      h(
        "div",
        { class: "btn-group flex-wrap", role: "group", "aria-label": p.texto },
        Array.from({ length: p.escala_max }, (_, i) => i + 1).flatMap((n) => [
          h("input", { type: "radio", class: "btn-check", name: nombre, id: `${nombre}-${n}`, value: n, required: requerido, autocomplete: "off" }),
          h("label", { class: "btn btn-outline-primary", for: `${nombre}-${n}` }, n),
        ]),
      ),
      h("div", { class: "form-text" }, `1 = lo más bajo · ${p.escala_max} = lo más alto`),
    );
  } else {
    control = h("textarea", { class: "form-control", name: nombre, rows: 3, maxlength: 2000, placeholder: "Escribí tu respuesta...", required: requerido });
  }

  const justificacion =
    p.permite_justificacion && p.tipo !== "texto_abierto"
      ? h(
          "div",
          { class: "mt-2" },
          h("textarea", { class: "form-control form-control-sm", name: `${nombre}-just`, rows: 2, maxlength: 1000, placeholder: "¿Por qué? Justificá tu respuesta (opcional)" }),
        )
      : null;

  return h("div", { class: "mb-3", dataset: { preguntaId: p.id, tipo: p.tipo, nombre } }, titulo, control, justificacion);
}

function leerRespuestas(form) {
  const respuestas = [];
  form.querySelectorAll("[data-pregunta-id]").forEach((bloque) => {
    const tipo = bloque.dataset.tipo;
    const nombre = bloque.dataset.nombre;
    const entrada = { pregunta_id: Number(bloque.dataset.preguntaId) };

    if (tipo === "opcion_multiple") {
      entrada.valor_opcion = form.querySelector(`input[name="${nombre}"]:checked`)?.value || "";
    } else if (tipo === "rating") {
      entrada.valor_rating = form.querySelector(`input[name="${nombre}"]:checked`)?.value || "";
    } else {
      entrada.valor_texto = form.querySelector(`textarea[name="${nombre}"]`)?.value.trim() || "";
    }
    const just = form.querySelector(`textarea[name="${nombre}-just"]`);
    if (just) entrada.justificacion = just.value.trim();
    respuestas.push(entrada);
  });
  return respuestas;
}

async function cargarEncuestasCiudadano() {
  const contenedor = document.getElementById("listaEncuestasCiudadano");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/encuestas");
  if (!ok) {
    contenedor.replaceChildren(h("p", { class: "text-danger small" }, data.mensaje || "No se pudieron cargar las encuestas"));
    return;
  }

  const encuestas = (data.encuestas || []).filter((e) => !e.yaRespondida);
  if (encuestas.length === 0) {
    contenedor.replaceChildren(h("p", { class: "text-muted small mb-0" }, "No tenés encuestas pendientes por ahora."));
    return;
  }

  contenedor.replaceChildren(
    ...encuestas.map((enc) => {
      const form = h(
        "form",
        { novalidate: false },
        (enc.preguntas || []).map((p) => crearCampoPregunta(p, enc.id)),
        h("div", { class: "text-end" }, h("button", { type: "submit", class: "btn btn-primary btn-sm" }, h("i", { class: "bi bi-send me-1" }), "Enviar respuestas")),
      );

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;

        const { ok, data } = await apiFetch(`/encuestas/${enc.id}/respuestas`, {
          method: "POST",
          body: { respuestas: leerRespuestas(form) },
        });
        if (ok) {
          mostrarToast("¡Gracias por responder!", "exito");
          cargarEncuestasCiudadano();
        } else {
          mostrarToast(data.mensaje || "No se pudo enviar tu respuesta", "error");
          boton.disabled = false;
        }
      });

      return h(
        "div",
        { class: "border rounded p-3 mb-3" },
        h("p", { class: "fw-semibold mb-1" }, enc.titulo),
        h(
          "p",
          { class: "text-muted small mb-2" },
          enc.tipo === "Satisfaccion" ? `Sobre el curso: ${enc.curso?.titulo || ""}` : `Categoría: ${enc.categoria?.nombre || "General"}`,
        ),
        enc.descripcion && h("p", { class: "small mb-3" }, enc.descripcion),
        form,
      );
    }),
  );
}
