// assets/js/consultas_representante.js
// Panel "Consultas recibidas" del representante: consultas que dejaron
// visitantes desde el detalle público de un curso. Requiere api.js y dom_utils.js.
let filtroConsultas = "todas";

const ESTILO_ESTADO_CONSULTA = {
  nueva: { clase: "bg-danger", texto: "Nueva" },
  leida: { clase: "bg-secondary", texto: "Leída" },
  respondida: { clase: "bg-success", texto: "Respondida" },
};

async function cambiarEstadoConsulta(id, estado) {
  const { ok, data } = await apiFetch(`/consultas/${id}/estado`, { method: "PUT", body: { estado } });
  if (!ok) {
    mostrarToast(data.mensaje || "No se pudo actualizar la consulta", "error");
    return;
  }
  cargarConsultasRepresentante();
}

async function cargarConsultasRepresentante() {
  const contenedor = document.getElementById("listaConsultasRepresentante");
  if (!contenedor) return;

  const { ok, data } = await apiFetch(filtroConsultas === "nuevas" ? "/consultas/mias?estado=nueva" : "/consultas/mias");
  if (!ok) {
    contenedor.replaceChildren(h("p", { class: "text-danger small" }, data.mensaje || "No se pudieron cargar las consultas"));
    return;
  }

  const insignia = document.getElementById("badgeConsultasNuevas");
  if (insignia) {
    insignia.textContent = data.nuevas;
    insignia.classList.toggle("d-none", !data.nuevas);
  }

  const filtros = h(
    "div",
    { class: "btn-group btn-group-sm mb-3", role: "group" },
    [["todas", "Todas"], ["nuevas", "Sólo nuevas"]].map(([valor, texto]) =>
      h(
        "button",
        {
          type: "button",
          class: `btn ${filtroConsultas === valor ? "btn-dark" : "btn-outline-dark"}`,
          onClick: () => {
            filtroConsultas = valor;
            cargarConsultasRepresentante();
          },
        },
        texto,
      ),
    ),
  );

  const consultas = data.consultas || [];
  if (consultas.length === 0) {
    contenedor.replaceChildren(filtros, h("p", { class: "text-muted small mb-0" }, filtroConsultas === "nuevas" ? "No tenés consultas nuevas." : "Todavía no recibiste consultas."));
    return;
  }

  contenedor.replaceChildren(
    filtros,
    ...consultas.map((c) => {
      const estilo = ESTILO_ESTADO_CONSULTA[c.estado];
      const asunto = encodeURIComponent(`Re: tu consulta sobre "${c.curso?.titulo || "el curso"}"`);
      return h(
        "div",
        { class: `border rounded p-3 mb-2 ${c.estado === "nueva" ? "border-danger-subtle bg-danger-subtle bg-opacity-25" : ""}` },
        h(
          "div",
          { class: "d-flex justify-content-between flex-wrap gap-2 mb-1" },
          h("span", { class: "fw-semibold" }, c.nombre, " ", h("span", { class: "text-muted fw-normal small" }, `· ${c.curso?.titulo || ""}`)),
          h("span", { class: `badge ${estilo.clase}` }, estilo.texto),
        ),
        h("div", { class: "small text-muted mb-2" }, h("i", { class: "bi bi-envelope me-1" }), c.email, " · ", formatearFecha(c.fecha_creacion)),
        h("p", { class: "mb-2", style: "white-space: pre-wrap;" }, c.mensaje),
        h(
          "div",
          { class: "d-flex flex-wrap gap-2" },
          h("a", { class: "btn btn-sm btn-primary", href: `mailto:${c.email}?subject=${asunto}`, onClick: () => c.estado !== "respondida" && cambiarEstadoConsulta(c.id, "respondida") }, h("i", { class: "bi bi-reply me-1" }), "Responder por email"),
          c.estado === "nueva" && h("button", { class: "btn btn-sm btn-outline-secondary", onClick: () => cambiarEstadoConsulta(c.id, "leida") }, "Marcar como leída"),
          c.estado !== "respondida" && h("button", { class: "btn btn-sm btn-outline-success", onClick: () => cambiarEstadoConsulta(c.id, "respondida") }, "Marcar como respondida"),
        ),
      );
    }),
  );
}
