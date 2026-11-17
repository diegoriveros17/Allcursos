// assets/js/encuesta_responder.js
// Lado del ciudadano: muestra las encuestas que le tocan (las de SUS cursos y las generales),
// con sus preguntas dinámicas (selección múltiple, valoración, texto abierto) y,
// en las generales, la votación de ideas de cursos.
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

// ---------- Ideas de cursos (encuestas generales) ----------
const ORIGEN_IDEA = {
  nuevo: { texto: "Curso nuevo", icono: "bi-stars" },
  volver: { texto: "Vuelve", icono: "bi-arrow-repeat" },
  propuesta: { texto: "Idea de estudiantes", icono: "bi-person-raised-hand" },
};

// Bloque de votación: ranking de ideas + "proponé tu idea"
function bloqueIdeas(enc, alCambiar) {
  const ideas = enc.ideas || [];
  const maxVotos = Math.max(1, ...ideas.map((i) => i.votos));
  const quedan = Math.max(0, enc.maxVotos - enc.misVotos);
  const logueado = !!obtenerSesion();

  const votar = async (idea, boton) => {
    if (!logueado) return mostrarToast("Iniciá sesión para votar", "advertencia");
    if (!idea.yaVote && quedan === 0) {
      return mostrarToast(`Ya usaste tus ${enc.maxVotos} votos. Quitá uno para elegir otra idea.`, "advertencia");
    }
    boton.disabled = true;
    const { ok, data } = await apiFetch(`/encuestas/${enc.id}/ideas/${idea.id}/voto`, { method: "POST" });
    if (!ok) {
      boton.disabled = false;
      return mostrarToast(data.mensaje || "No se pudo registrar el voto", "error");
    }
    alCambiar();
  };

  const filas = ideas.map((idea, i) => {
    const origen = ORIGEN_IDEA[idea.origen] || ORIGEN_IDEA.nuevo;
    const boton = h(
      "button",
      {
        type: "button",
        class: `btn btn-sm btn-votar-idea ${idea.yaVote ? "votado" : ""}`,
        "aria-pressed": idea.yaVote ? "true" : "false",
        title: idea.yaVote ? "Quitar mi voto" : "Apoyar esta idea",
      },
      h("i", { class: `bi ${idea.yaVote ? "bi-hand-thumbs-up-fill" : "bi-hand-thumbs-up"} me-1` }),
      idea.yaVote ? "Apoyada" : "Apoyar",
    );
    boton.addEventListener("click", () => votar(idea, boton));
    return h(
      "li",
      { class: `idea-fila ${idea.yaVote ? "votada" : ""}` },
      h("span", { class: `idea-puesto ${i === 0 && idea.votos > 0 ? "primero" : ""}` }, i === 0 && idea.votos > 0 ? h("i", { class: "bi bi-trophy-fill" }) : i + 1),
      h(
        "div",
        { class: "idea-info" },
        h("div", { class: "idea-titulo" }, idea.titulo, idea.esMia ? h("span", { class: "idea-mia" }, "tu idea") : null),
        h("div", { class: "idea-origen" }, h("i", { class: `bi ${origen.icono} me-1` }), origen.texto),
        h("div", { class: "idea-barra" }, h("span", { style: `width: ${Math.round((idea.votos / maxVotos) * 100)}%` })),
      ),
      h("span", { class: "idea-votos" }, h("strong", {}, idea.votos), idea.votos === 1 ? " voto" : " votos"),
      boton,
    );
  });

  let propuesta = null;
  if (enc.permite_propuestas && logueado) {
    if (enc.misPropuestas >= enc.maxPropuestas) {
      propuesta = h("p", { class: "small text-muted mb-0 mt-2" }, h("i", { class: "bi bi-check2-circle me-1" }), `Ya propusiste ${enc.maxPropuestas} ideas en esta encuesta.`);
    } else {
      const campo = h("input", { type: "text", class: "form-control", maxlength: 150, placeholder: "¿Qué curso te gustaría? Ej: Peluquería, Inglés básico...", "aria-label": "Tu idea de curso" });
      const enviar = h("button", { type: "submit", class: "btn btn-primary" }, h("i", { class: "bi bi-send me-1" }), "Proponer");
      propuesta = h(
        "form",
        {
          class: "idea-proponer",
          onSubmit: async (e) => {
            e.preventDefault();
            const titulo = campo.value.trim();
            if (titulo.length < 3) return mostrarToast("Escribí el nombre del curso que te gustaría", "advertencia");
            enviar.disabled = true;
            const { ok, data } = await apiFetch(`/encuestas/${enc.id}/ideas`, { method: "POST", body: { titulo } });
            enviar.disabled = false;
            if (!ok) return mostrarToast(data.mensaje || "No se pudo guardar tu idea", "error");
            mostrarToast(data.mensaje, "exito");
            alCambiar();
          },
        },
        h("label", { class: "form-label small fw-semibold mb-1" }, h("i", { class: "bi bi-lightbulb me-1" }), "¿No está el curso que querés? Proponelo"),
        h("div", { class: "input-group input-group-sm" }, campo, enviar),
      );
    }
  }

  return h(
    "div",
    { class: "ideas-votacion" },
    h(
      "div",
      { class: "ideas-votacion-cabecera" },
      h("span", { class: "fw-semibold" }, h("i", { class: "bi bi-bar-chart-steps me-1" }), "Ideas de cursos más votadas"),
      logueado
        ? h("span", { class: `ideas-votos-restantes ${quedan === 0 ? "agotados" : ""}` }, quedan === 0 ? "Usaste tus votos" : `Te ${quedan === 1 ? "queda 1 voto" : `quedan ${quedan} votos`}`)
        : null,
    ),
    ideas.length
      ? h("ol", { class: "ideas-lista" }, filas)
      : h("p", { class: "small text-muted mb-0" }, "Todavía no hay ideas. ¡Sé el primero en proponer una!"),
    propuesta,
  );
}

async function cargarEncuestasCiudadano() {
  const contenedor = document.getElementById("listaEncuestasCiudadano");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/encuestas");
  if (!ok) {
    contenedor.replaceChildren(h("p", { class: "text-danger small" }, data.mensaje || "No se pudieron cargar las encuestas"));
    return;
  }

  // Qué le queda por hacer en cada encuesta: responder preguntas y/o votar ideas
  const tienePreguntasPendientes = (e) => (e.preguntas || []).length > 0 && !e.yaRespondida;
  const tieneVotacion = (e) => e.tipo === "Interes" && ((e.ideas || []).length > 0 || e.permite_propuestas);
  const encuestas = (data.encuestas || []).filter((e) => tienePreguntasPendientes(e) || tieneVotacion(e));
  const pendientes = encuestas.filter((e) => tienePreguntasPendientes(e) || (tieneVotacion(e) && e.misVotos === 0)).length;
  if (typeof actualizarMetrica === "function") actualizarMetrica("encuestas", pendientes); // Tarjeta de métricas del panel

  if (encuestas.length === 0) {
    contenedor.replaceChildren(
      h("div", { class: "vacio-panel" },
        h("i", { class: "bi bi-clipboard2-check" }),
        h("p", { class: "fw-semibold mb-1" }, "Estás al día"),
        h("p", { class: "small text-muted mb-0" }, "No tenés encuestas pendientes por ahora.")),
    );
    return;
  }

  // Primero las de mis cursos, después las generales
  encuestas.sort((a, b) => Number(b.tipo === "Satisfaccion") - Number(a.tipo === "Satisfaccion"));

  contenedor.replaceChildren(
    ...encuestas.map((enc) => {
      const deCurso = enc.tipo === "Satisfaccion";
      let form = null;

      if (tienePreguntasPendientes(enc)) {
        form = h(
          "form",
          { novalidate: false, class: "encuesta-preguntas" },
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
      } else if ((enc.preguntas || []).length > 0) {
        form = h("p", { class: "small text-success mb-0" }, h("i", { class: "bi bi-check-circle-fill me-1" }), "Ya respondiste las preguntas. ¡Gracias!");
      }

      // La votación se redibuja sola al votar o proponer, sin tocar lo que se esté respondiendo arriba
      const zonaIdeas = h("div", {});
      const dibujarIdeas = (datos) => zonaIdeas.replaceChildren(bloqueIdeas(datos, recargarIdeas));
      const recargarIdeas = async () => {
        const r = await apiFetch("/encuestas");
        const actual = r.ok ? (r.data.encuestas || []).find((x) => x.id === enc.id) : null;
        if (actual) dibujarIdeas(actual);
        else cargarEncuestasCiudadano(); // Si la encuesta se finalizó mientras tanto, se recarga todo
      };
      if (tieneVotacion(enc)) dibujarIdeas(enc);

      const vigencia = enc.fecha_cierre
        ? `Disponible hasta el ${formatearDia(enc.fecha_cierre)}`
        : "Disponible hasta que la institución la cierre";

      return h(
        "div",
        { class: `encuesta-pendiente ${deCurso ? "de-curso" : "general"}` },
        h(
          "div",
          { class: "encuesta-etiquetas" },
          deCurso
            ? h("span", { class: "encuesta-etiqueta curso" }, h("i", { class: "bi bi-mortarboard-fill me-1" }), `Tu curso: ${enc.curso?.titulo || ""}`)
            : h("span", { class: "encuesta-etiqueta general" }, h("i", { class: "bi bi-megaphone-fill me-1" }), "¿Qué curso traemos?"),
          enc.institucion?.nombre ? h("span", { class: "encuesta-institucion" }, h("i", { class: "bi bi-bank me-1" }), enc.institucion.nombre) : null,
        ),
        h("p", { class: "fw-semibold mb-1 encuesta-titulo" }, enc.titulo),
        h("p", { class: "encuesta-vigencia" }, h("i", { class: "bi bi-hourglass-split me-1" }), vigencia),
        enc.descripcion && h("p", { class: "small mb-3" }, enc.descripcion),
        tieneVotacion(enc) ? zonaIdeas : null,
        form,
      );
    }),
  );
}
