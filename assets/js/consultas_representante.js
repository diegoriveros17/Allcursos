// assets/js/consultas_representante.js
// Consultas sobre los cursos, respondidas SÓLO dentro de la plataforma (sin email):
//  - Panel del representante: "Consultas recibidas" (cargarConsultasRepresentante)
//  - Panel del ciudadano: "Mis consultas" (cargarConsultasCiudadano)
// Cada consulta es una conversación: el mensaje original + las respuestas de ida y vuelta.
// Requiere api.js y dom_utils.js.
let filtroConsultas = "todas";
const consultasAbiertas = new Set(); // Conversaciones desplegadas: siguen abiertas al recargar la lista

const ESTILO_ESTADO_CONSULTA = {
  nueva: { clase: "bg-danger", texto: "Nueva" },
  leida: { clase: "bg-secondary", texto: "Leída" },
  respondida: { clase: "bg-success", texto: "Respondida" },
};

// ---------- Piezas comunes a los dos paneles ----------

const inicialesConsulta = (nombre = "") =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";

// Une el mensaje original con las respuestas, en orden
function mensajesDeConsulta(c) {
  const original = { autor: "ciudadano", mensaje: c.mensaje, fecha: c.fecha_creacion, nombre: c.nombre };
  const resto = (c.mensajes || []).map((m) => ({
    autor: m.autor,
    mensaje: m.mensaje,
    fecha: m.fecha_creacion,
    nombre:
      m.autor === "representante"
        ? [c.institucion?.nombre, m.autor_usuario?.persona?.nombre].filter(Boolean).join(" · ")
        : c.nombre,
  }));
  return [original, ...resto];
}

// Burbuja de chat: los mensajes propios van a la derecha
function burbujaMensaje(m, autorPropio) {
  const propio = m.autor === autorPropio;
  return h(
    "div",
    { class: `burbuja-fila ${propio ? "propia" : ""}` },
    h("span", { class: `burbuja-avatar ${m.autor === "representante" ? "institucion" : ""}`, "aria-hidden": "true" },
      m.autor === "representante" ? h("i", { class: "bi bi-bank" }) : inicialesConsulta(m.nombre)),
    h(
      "div",
      { class: "burbuja" },
      h("div", { class: "burbuja-autor" }, propio ? "Vos" : m.nombre),
      h("div", { class: "burbuja-texto" }, m.mensaje),
      h("div", { class: "burbuja-fecha", title: formatearFecha(m.fecha) }, tiempoRelativo(m.fecha)),
    ),
  );
}

// Caja para escribir: Enter envía, Shift+Enter hace un salto de línea
function cajaRespuesta(consultaId, placeholder, alEnviar) {
  const campo = h("textarea", { class: "form-control", rows: "1", maxlength: "2000", placeholder, "aria-label": placeholder });
  const boton = h("button", { type: "submit", class: "btn btn-primary btn-enviar-mensaje", title: "Enviar", "aria-label": "Enviar mensaje" },
    h("i", { class: "bi bi-send-fill" }));

  // El campo crece mientras se escribe (hasta un máximo)
  const ajustarAlto = () => {
    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 160)}px`;
  };
  campo.addEventListener("input", ajustarAlto);
  campo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  const form = h(
    "form",
    {
      class: "caja-respuesta",
      onSubmit: async (e) => {
        e.preventDefault();
        const texto = campo.value.trim();
        if (texto.length < 2) {
          mostrarToast("Escribí un mensaje antes de enviarlo.", "advertencia");
          campo.focus();
          return;
        }
        boton.disabled = true;
        campo.disabled = true;
        boton.replaceChildren(h("span", { class: "spinner-border spinner-border-sm" }));
        const { ok, data } = await apiFetch(`/consultas/${consultaId}/mensajes`, { method: "POST", body: { mensaje: texto } });
        if (ok) {
          mostrarToast(data.mensaje || "Mensaje enviado", "exito");
          consultasAbiertas.add(consultaId); // Que la conversación siga abierta al recargar
          alEnviar();
        } else {
          mostrarToast(data.mensaje || "No se pudo enviar el mensaje", "error");
          boton.disabled = false;
          campo.disabled = false;
          boton.replaceChildren(h("i", { class: "bi bi-send-fill" }));
        }
      },
    },
    campo,
    boton,
  );
  return h("div", {}, form, h("div", { class: "caja-respuesta-ayuda" }, "Enter para enviar · Shift + Enter para un salto de línea"));
}

// Tarjeta desplegable de una consulta: arriba el resumen, adentro la conversación
function tarjetaConsulta({ c, autorPropio, titulo, subtitulo, etiqueta, destacada, abrirAlInicio = false, placeholder, alAbrir, alEnviar }) {
  const mensajes = mensajesDeConsulta(c);
  const ultimo = mensajes[mensajes.length - 1];
  const conversacion = h("div", { class: "conversacion" }, mensajes.map((m) => burbujaMensaje(m, autorPropio)));

  const detalle = h(
    "details",
    { class: `consulta-item ${destacada ? "destacada" : ""}`, open: consultasAbiertas.has(c.id) || abrirAlInicio },
    h(
      "summary",
      {},
      h("span", { class: "consulta-avatar", "aria-hidden": "true" }, autorPropio === "ciudadano" ? h("i", { class: "bi bi-bank" }) : inicialesConsulta(c.nombre)),
      h(
        "span",
        { class: "consulta-resumen" },
        h("span", { class: "consulta-titulo" }, titulo, h("span", { class: "consulta-subtitulo" }, ` · ${subtitulo}`)),
        h("span", { class: "consulta-vista-previa" }, `${ultimo.autor === autorPropio ? "Vos: " : ""}${ultimo.mensaje}`),
      ),
      h("span", { class: "consulta-meta" }, etiqueta, h("small", { class: "text-muted" }, tiempoRelativo(ultimo.fecha))),
      h("i", { class: "bi bi-chevron-down consulta-flecha" }),
    ),
    h("div", { class: "consulta-cuerpo" }, conversacion, cajaRespuesta(c.id, placeholder, alEnviar)),
  );

  detalle.addEventListener("toggle", () => {
    if (detalle.open) {
      consultasAbiertas.add(c.id);
      conversacion.scrollTop = conversacion.scrollHeight; // Muestra el último mensaje
      alAbrir?.();
    } else {
      consultasAbiertas.delete(c.id);
    }
  });
  // Si arranca abierta, se baja hasta el último mensaje y cuenta como "abierta" (alAbrir no se repite: revisa su estado)
  if (detalle.open) {
    requestAnimationFrame(() => (conversacion.scrollTop = conversacion.scrollHeight));
    queueMicrotask(() => alAbrir?.());
  }
  return detalle;
}

// Si se llegó con #consultas o #mis-consultas (ej: desde la campanita), baja hasta esa sección
function irASeccionConsultasSiCorresponde(idSeccion) {
  if (window.location.hash === `#${idSeccion}`) {
    document.getElementById(idSeccion)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------- Panel del representante ----------

async function cambiarEstadoConsulta(id, estado, { recargar = true } = {}) {
  const { ok, data } = await apiFetch(`/consultas/${id}/estado`, { method: "PUT", body: { estado } });
  if (!ok) {
    mostrarToast(data.mensaje || "No se pudo actualizar la consulta", "error");
    return;
  }
  if (recargar) cargarConsultasRepresentante();
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
  if (typeof actualizarMetrica === "function") actualizarMetrica("consultas", data.nuevas || 0); // Tarjeta de métricas del panel

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
      return tarjetaConsulta({
        c,
        autorPropio: "representante",
        titulo: c.nombre,
        subtitulo: c.curso?.titulo || "",
        etiqueta: h("span", { class: `badge ${estilo.clase}` }, estilo.texto),
        destacada: c.estado === "nueva",
        placeholder: `Escribile tu respuesta a ${c.nombre}...`,
        // Al abrir una consulta nueva se marca como leída (sin recargar, para no cerrarla)
        alAbrir: () => {
          if (c.estado !== "nueva") return;
          c.estado = "leida";
          cambiarEstadoConsulta(c.id, "leida", { recargar: false });
          if (insignia) {
            const restantes = Math.max(0, Number(insignia.textContent) - 1);
            insignia.textContent = restantes;
            insignia.classList.toggle("d-none", !restantes);
            if (typeof actualizarMetrica === "function") actualizarMetrica("consultas", restantes);
          }
        },
        alEnviar: cargarConsultasRepresentante,
      });
    }),
  );
  irASeccionConsultasSiCorresponde("consultas");
}

// ---------- Panel del ciudadano ----------

async function cargarConsultasCiudadano() {
  const contenedor = document.getElementById("listaConsultasCiudadano");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/consultas/enviadas");
  if (!ok) {
    contenedor.replaceChildren(h("p", { class: "text-danger small" }, data.mensaje || "No se pudieron cargar tus consultas"));
    return;
  }

  const insignia = document.getElementById("badgeConsultasCiudadano");
  const pintarInsignia = (n) => {
    if (!insignia) return;
    insignia.textContent = n === 1 ? "1 respuesta nueva" : `${n} respuestas nuevas`;
    insignia.classList.toggle("d-none", !n);
    if (typeof actualizarMetrica === "function") actualizarMetrica("respuestas", n); // Tarjeta de métricas del panel
  };
  let novedades = data.novedades || 0;
  pintarInsignia(novedades);

  const consultas = data.consultas || [];
  if (consultas.length === 0) {
    contenedor.replaceChildren(
      h("div", { class: "text-center text-muted small py-3" },
        h("i", { class: "bi bi-chat-square-text fs-3 d-block mb-2" }),
        "Todavía no hiciste consultas. Podés preguntarle a una institución desde la página de cualquier curso."),
    );
    return;
  }

  contenedor.replaceChildren(
    ...consultas.map((c) => {
      const respondida = (c.mensajes || []).some((m) => m.autor === "representante");
      const etiqueta = c.novedad_ciudadano
        ? h("span", { class: "badge bg-success" }, h("i", { class: "bi bi-envelope-paper-fill me-1" }), "Respuesta nueva")
        : respondida
          ? h("span", { class: "badge bg-secondary" }, "Respondida")
          : h("span", { class: "badge text-bg-light border" }, "Esperando respuesta");
      return tarjetaConsulta({
        c,
        autorPropio: "ciudadano",
        titulo: c.curso?.titulo || "Curso",
        subtitulo: c.institucion?.nombre || "",
        etiqueta,
        destacada: c.novedad_ciudadano,
        abrirAlInicio: c.novedad_ciudadano, // Una respuesta nueva se muestra abierta
        placeholder: "Escribí tu mensaje a la institución...",
        // Al abrir una respuesta nueva, se marca como vista
        alAbrir: () => {
          if (!c.novedad_ciudadano) return;
          c.novedad_ciudadano = false;
          apiFetch(`/consultas/${c.id}/vista`, { method: "PUT" });
          novedades = Math.max(0, novedades - 1);
          pintarInsignia(novedades);
        },
        alEnviar: cargarConsultasCiudadano,
      });
    }),
  );
  irASeccionConsultasSiCorresponde("mis-consultas");
}
