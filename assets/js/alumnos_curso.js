// assets/js/alumnos_curso.js
// Gestión de alumnos de un curso (sólo representantes): métricas, buscador,
// filtros por estado, tarjeta con el perfil de cada alumno y su ficha completa.
// Todo se arma con h() (dom_utils.js): los datos del alumno nunca se interpretan como HTML.

const ESTADOS_ALUMNO = {
  "En espera": { texto: "En espera", clase: "espera", icono: "bi-hourglass-split" },
  Inscripto: { texto: "Inscripto", clase: "inscripto", icono: "bi-check2-circle" },
  Cursando: { texto: "Cursando", clase: "cursando", icono: "bi-play-circle" },
  Finalizado: { texto: "Finalizado", clase: "finalizado", icono: "bi-award" },
  Cancelado: { texto: "Dado de baja", clase: "cancelado", icono: "bi-box-arrow-right" },
};

// El certificado sólo existe si la institución lo emitió (y no lo anuló)
const tieneCertificado = (ins) => !!ins.certificado && !ins.certificado.anulado;
// Se puede certificar a quien está cursando o terminó, mientras no tenga un certificado vigente
const puedeCertificarse = (ins) => ["Inscripto", "Cursando", "Finalizado"].includes(ins.estado) && !tieneCertificado(ins);

const FILTROS_ALUMNOS = [
  { clave: "todos", texto: "Todos", estados: null },
  { clave: "activos", texto: "Activos", estados: ["En espera", "Inscripto", "Cursando"] },
  { clave: "por_certificar", texto: "Por certificar", prueba: (a) => a.estado === "Finalizado" && !tieneCertificado(a) },
  { clave: "certificados", texto: "Certificados", prueba: tieneCertificado },
  { clave: "bajas", texto: "Dados de baja", estados: ["Cancelado"] },
];
const pasaFiltro = (f, ins) => (f.prueba ? f.prueba(ins) : !f.estados || f.estados.includes(ins.estado));

let alumnos = []; // Inscripciones del curso (con usuario y persona)
let filtroAlumnos = "todos";
let cursoActual = null;

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = obtenerSesion();
  if (!sesion || sesion.rol !== "representante") {
    window.location.href = "index.html";
    return;
  }

  const cursoId = new URLSearchParams(window.location.search).get("id");
  if (!cursoId) {
    window.location.href = "dashboard.html";
    return;
  }

  const { ok, data } = await apiFetch(`/cursos/${encodeURIComponent(cursoId)}/alumnos`);
  if (!ok) {
    document.getElementById("nombreCursoTitulo").textContent = "No se pudo cargar el curso";
    document.getElementById("listaAlumnos").replaceChildren(
      h("div", { class: "col-12" }, h("div", { class: "alert alert-danger mb-0" }, data.mensaje || "Error al cargar los alumnos")),
    );
    return;
  }

  alumnos = (data.inscripciones || []).filter((ins) => ins.usuario?.persona);
  cursoActual = data.curso;
  dibujarCabeceraCurso(data.curso);
  redibujarAlumnos();
  document.getElementById("buscarAlumno").addEventListener("input", dibujarAlumnos);
});

// ---------- Utilidades ----------
const nombreCompleto = (p) => [p?.nombre, p?.apellido].filter(Boolean).join(" ");
const inicialesAlumno = (p) => ((p?.nombre?.[0] || "") + (p?.apellido?.[0] || "")).toUpperCase() || "?";

// Cada alumno tiene un color de avatar fijo (sale de su nombre)
const COLORES_AVATAR = ["#1e3a5f", "#2f7d6b", "#24566e", "#6b4fa0", "#b45309", "#9f1d4a", "#1d5f99"];
function colorAvatar(texto) {
  let suma = 0;
  for (const c of String(texto)) suma += c.charCodeAt(0);
  return COLORES_AVATAR[suma % COLORES_AVATAR.length];
}

function avatarAlumno(persona, clase) {
  if (persona?.avatar_url) return h("img", { class: clase, src: persona.avatar_url, alt: "" });
  return h("span", { class: `${clase} avatar-letras`, style: `background:${colorAvatar(nombreCompleto(persona))}` }, inicialesAlumno(persona));
}

function fechaCortaAlumno(fecha) {
  const d = new Date(fecha);
  return isNaN(d) ? "" : d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function edadDe(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const [a, m, d] = String(fechaNacimiento).slice(0, 10).split("-").map(Number);
  if (!a) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return edad > 0 && edad < 120 ? edad : null;
}

// Link de WhatsApp a partir del teléfono (si es un número argentino de 10 dígitos, se le agrega 549)
function linkWhatsapp(telefono) {
  let numero = String(telefono || "").replace(/\D/g, "");
  if (!numero) return null;
  if (numero.length === 10) numero = `549${numero}`;
  return `https://wa.me/${numero}`;
}

const chipEstado = (estado) => {
  const e = ESTADOS_ALUMNO[estado] || ESTADOS_ALUMNO.Inscripto;
  return h("span", { class: `estado-chip ${e.clase}` }, h("i", { class: `bi ${e.icono}` }), e.texto);
};

// ---------- Cabecera y métricas ----------
function dibujarCabeceraCurso(curso) {
  document.title = `Alumnos: ${curso.titulo} - AllCursos`;
  document.getElementById("nombreCursoTitulo").textContent = curso.titulo;
  if (curso.imagen_url) {
    document.getElementById("imagenCursoAlumnos").replaceChildren(h("img", { src: curso.imagen_url, alt: "" }));
  }
  const fecha = (f) => {
    const [a, m, d] = String(f).slice(0, 10).split("-");
    return `${d}/${m}/${a}`;
  };
  const chips = [
    curso.modalidad && h("span", { class: "panel-chip" }, h("i", { class: "bi bi-laptop me-1" }), curso.modalidad),
    curso.duracion_horas && h("span", { class: "panel-chip" }, h("i", { class: "bi bi-clock me-1" }), `${curso.duracion_horas} horas`),
    (curso.fecha_inicio || curso.fecha_fin) &&
      h("span", { class: "panel-chip" }, h("i", { class: "bi bi-calendar-event me-1" }),
        `${curso.fecha_inicio ? fecha(curso.fecha_inicio) : "Sin fecha"} – ${curso.fecha_fin ? fecha(curso.fecha_fin) : "Sin fecha"}`),
  ];
  document.getElementById("chipsCursoAlumnos").replaceChildren(...chips.filter(Boolean));
}

function dibujarMetricasAlumnos(curso) {
  const cuenta = (estados) => alumnos.filter((a) => estados.includes(a.estado)).length;
  const activos = cuenta(["En espera", "Inscripto", "Cursando"]);
  const metricas = [
    { icono: "bi-people", etiqueta: "Alumnos activos", valor: activos, color: "primario" },
    { icono: "bi-door-open", etiqueta: "Cupos libres", valor: `${Math.max(0, (curso.cupo_maximo || 0) - activos - cuenta(["Finalizado"]))} de ${curso.cupo_maximo}`, color: "azul" },
    { icono: "bi-award", etiqueta: "Certificados emitidos", valor: alumnos.filter(tieneCertificado).length, color: "verde" },
    { icono: "bi-box-arrow-right", etiqueta: "Dados de baja", valor: cuenta(["Cancelado"]), color: "ambar" },
  ];
  document.getElementById("metricasAlumnos").replaceChildren(
    ...metricas.map((m) =>
      h("div", { class: "col-6 col-lg-3" },
        h("div", { class: `tarjeta-metrica metrica-${m.color}` },
          h("span", { class: "metrica-icono" }, h("i", { class: `bi ${m.icono}` })),
          h("span", { class: "metrica-datos" },
            h("span", { class: "metrica-valor" }, String(m.valor)),
            h("span", { class: "metrica-etiqueta" }, m.etiqueta),
          ),
        ),
      ),
    ),
  );
}

function dibujarFiltrosAlumnos() {
  document.getElementById("filtrosAlumnos").replaceChildren(
    ...FILTROS_ALUMNOS.map((f) => {
      const cantidad = alumnos.filter((a) => pasaFiltro(f, a)).length;
      return h("button", {
        type: "button",
        role: "tab",
        class: `pildora${filtroAlumnos === f.clave ? " activa" : ""}`,
        "aria-selected": filtroAlumnos === f.clave ? "true" : "false",
        onClick: () => {
          filtroAlumnos = f.clave;
          dibujarFiltrosAlumnos();
          dibujarAlumnos();
        },
      }, f.texto, h("span", { class: "pildora-cantidad" }, cantidad));
    }),
  );
}

// ---------- Tarjetas de alumnos ----------
function dibujarAlumnos() {
  const lista = document.getElementById("listaAlumnos");
  if (alumnos.length === 0) {
    lista.replaceChildren(
      h("div", { class: "col-12" },
        h("div", { class: "vacio-panel" },
          h("i", { class: "bi bi-people" }),
          h("p", { class: "fw-semibold mb-1" }, "Todavía no hay alumnos inscriptos"),
          h("p", { class: "small text-muted mb-0" }, "Cuando alguien se inscriba vas a verlo acá y te avisamos en la campanita."))),
    );
    return;
  }

  const filtro = FILTROS_ALUMNOS.find((f) => f.clave === filtroAlumnos);
  const texto = (document.getElementById("buscarAlumno").value || "").trim().toLowerCase();
  const visibles = alumnos.filter((ins) => {
    if (!pasaFiltro(filtro, ins)) return false;
    if (!texto) return true;
    const p = ins.usuario.persona;
    return `${nombreCompleto(p)} ${p.dni || ""} ${ins.usuario.email_login || ""}`.toLowerCase().includes(texto);
  });

  if (visibles.length === 0) {
    lista.replaceChildren(h("div", { class: "col-12 text-center text-muted py-4" }, "Ningún alumno coincide con la búsqueda."));
    return;
  }
  lista.replaceChildren(...visibles.map(tarjetaAlumno));
}

// Franja con el estado del certificado del alumno
function estadoCertificado(ins) {
  if (tieneCertificado(ins)) {
    return h("div", { class: "tarjeta-alumno-certificado emitido" },
      h("i", { class: "bi bi-patch-check-fill" }),
      h("span", {}, `Certificado emitido el ${fechaCortaAlumno(ins.certificado.fecha_emision)}`));
  }
  if (ins.estado === "Finalizado") {
    return h("div", { class: "tarjeta-alumno-certificado pendiente" },
      h("i", { class: "bi bi-hourglass-split" }),
      h("span", {}, ins.certificado?.anulado ? "Certificado anulado" : "Terminó la cursada: falta decidir si se certifica"));
  }
  return null;
}

function tarjetaAlumno(ins) {
  const p = ins.usuario.persona;
  return h("div", { class: "col-md-6 col-xl-4" },
    h("article", { class: `tarjeta-alumno${ins.estado === "Cancelado" ? " de-baja" : ""}` },
      h("div", { class: "tarjeta-alumno-cabecera" },
        avatarAlumno(p, "avatar-alumno"),
        h("div", { class: "min-w-0 flex-grow-1" },
          h("p", { class: "tarjeta-alumno-nombre" }, nombreCompleto(p)),
          h("p", { class: "tarjeta-alumno-dato" }, h("i", { class: "bi bi-person-vcard me-1" }), `DNI ${p.dni || "-"}`),
        ),
        chipEstado(ins.estado),
      ),
      h("ul", { class: "tarjeta-alumno-lista" },
        h("li", {}, h("i", { class: "bi bi-envelope" }), h("span", { class: "text-truncate" }, ins.usuario.email_login || "Sin email")),
        h("li", {}, h("i", { class: "bi bi-telephone" }), h("span", {}, p.telefono || "Sin teléfono cargado")),
        h("li", {}, h("i", { class: "bi bi-calendar-check" }), h("span", {}, `Se inscribió el ${fechaCortaAlumno(ins.fecha_inscripcion)}`)),
      ),
      ins.motivo_baja &&
        h("div", { class: "tarjeta-alumno-baja" },
          h("strong", {}, "Motivo de la baja: "), ins.motivo_baja,
          ins.comentario_baja && h("em", { class: "d-block mt-1" }, `"${ins.comentario_baja}"`)),
      estadoCertificado(ins),
      h("div", { class: "tarjeta-alumno-pie" },
        h("button", { type: "button", class: "btn btn-sm btn-primary", onClick: () => mostrarModalContacto(ins.id) },
          h("i", { class: "bi bi-person-lines-fill me-1" }), "Ver perfil"),
        h("a", { class: "btn btn-sm btn-outline-secondary", href: `mailto:${ins.usuario.email_login}`, title: "Escribirle un email" },
          h("i", { class: "bi bi-envelope" })),
        puedeCertificarse(ins) &&
          h("button", { type: "button", class: "btn btn-sm btn-success ms-auto", onClick: () => emitirCertificado(ins.id, nombreCompleto(p)) },
            h("i", { class: "bi bi-award me-1" }), "Certificar"),
      ),
    ),
  );
}

// ---------- Perfil completo del alumno ----------
function filaPerfil(icono, etiqueta, valor, acciones) {
  return h("div", { class: "fila-perfil" },
    h("i", { class: `bi ${icono}` }),
    h("div", { class: "min-w-0 flex-grow-1" },
      h("span", { class: "fila-perfil-etiqueta" }, etiqueta),
      h("span", { class: "fila-perfil-valor" }, valor),
    ),
    acciones && h("div", { class: "d-flex gap-1 flex-shrink-0" }, acciones),
  );
}

function mostrarModalContacto(inscripcionId) {
  const ins = alumnos.find((a) => a.id === inscripcionId);
  if (!ins) return;
  const p = ins.usuario.persona;
  const email = ins.usuario.email_login;
  const whatsapp = linkWhatsapp(p.telefono);
  const edad = edadDe(p.fecha_nacimiento);
  const textoDni = {
    Verificado: "Verificado contra el padrón",
    No_verificado: "No se pudo confirmar en el padrón",
  }[p.dni_verificado] || "Sin verificar (todavía no hay un servicio de verificación conectado)";

  const botonCopiar = h("button", { type: "button", class: "btn btn-sm btn-outline-secondary", title: "Copiar email" }, h("i", { class: "bi bi-copy" }));
  botonCopiar.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      mostrarToast("Email copiado", "exito");
    } catch {
      mostrarToast("No se pudo copiar el email", "error");
    }
  });

  const activo = ["Inscripto", "Cursando"].includes(ins.estado);
  const contenido = document.getElementById("cuerpoModalContacto");
  contenido.replaceChildren(
    h("div", { class: "perfil-alumno-cabecera" },
      h("button", { type: "button", class: "btn-close btn-close-white position-absolute top-0 end-0 m-3", "data-bs-dismiss": "modal", "aria-label": "Cerrar" }),
      avatarAlumno(p, "avatar-alumno grande"),
      h("h5", { class: "mb-1 mt-2", id: "modalContactoLabel" }, nombreCompleto(p)),
      h("div", { class: "d-flex justify-content-center gap-2 flex-wrap" },
        chipEstado(ins.estado),
        h("span", { class: "panel-chip" }, h("i", { class: "bi bi-person-vcard me-1" }), `DNI ${p.dni || "-"}`)),
    ),
    h("div", { class: "modal-body" },
      h("p", { class: "seccion-perfil" }, "Contacto"),
      filaPerfil("bi-envelope", "Email", email || "Sin email", [
        email && h("a", { class: "btn btn-sm btn-outline-primary", href: `mailto:${email}`, title: "Escribirle un email" }, h("i", { class: "bi bi-send" })),
        email && botonCopiar,
      ]),
      filaPerfil("bi-telephone", "Teléfono", p.telefono || "No cargó un teléfono", p.telefono && [
        h("a", { class: "btn btn-sm btn-outline-primary", href: `tel:${p.telefono}`, title: "Llamar" }, h("i", { class: "bi bi-telephone-outbound" })),
        whatsapp && h("a", { class: "btn btn-sm btn-outline-success", href: whatsapp, target: "_blank", rel: "noopener", title: "Escribir por WhatsApp" }, h("i", { class: "bi bi-whatsapp" })),
      ]),

      h("p", { class: "seccion-perfil" }, "Datos personales"),
      filaPerfil("bi-shield-check", "Identidad (DNI)", textoDni),
      edad && filaPerfil("bi-cake2", "Edad", `${edad} años`),

      h("p", { class: "seccion-perfil" }, "Inscripción"),
      filaPerfil("bi-calendar-check", "Fecha de inscripción", fechaCortaAlumno(ins.fecha_inscripcion)),
      filaPerfil("bi-patch-check", "Contacto verificado",
        ins.contacto_verificado ? "Sí: confirmó un código enviado a su email o teléfono" : "No: se inscribió con su cuenta, sin código adicional"),
      filaPerfil("bi-award", "Certificado",
        tieneCertificado(ins)
          ? `Emitido el ${fechaCortaAlumno(ins.certificado.fecha_emision)} · código ${ins.certificado.codigo_verificacion}`
          : ins.certificado?.anulado ? "Anulado: ya no es válido" : "Todavía no emitido"),

      ins.motivo_baja && [
        h("p", { class: "seccion-perfil" }, "Baja del curso"),
        filaPerfil("bi-box-arrow-right", "Motivo", ins.motivo_baja),
        ins.comentario_baja && filaPerfil("bi-chat-quote", "Lo que nos contó", ins.comentario_baja),
        ins.fecha_baja && filaPerfil("bi-calendar-x", "Fecha de la baja", fechaCortaAlumno(ins.fecha_baja)),
      ],

      h("div", { class: "nota-privacidad" },
        h("i", { class: "bi bi-lock" }),
        h("span", {}, "Estos datos son privados del alumno. Usalos sólo para comunicarte por temas de este curso: horarios, cambios, avisos o su certificado.")),
    ),
    h("div", { class: "modal-footer flex-wrap" },
      puedeCertificarse(ins) && h("button", { type: "button", class: "btn btn-success", onClick: () => emitirCertificado(ins.id, nombreCompleto(p)) },
        h("i", { class: "bi bi-award me-1" }), "Emitir certificado"),
      activo && h("button", { type: "button", class: "btn btn-outline-secondary", title: "Por ejemplo, si no asistió o no aprobó", onClick: () => marcarFinalizado(ins.id, nombreCompleto(p)) },
        h("i", { class: "bi bi-flag me-1" }), "Cerrar sin certificado"),
      tieneCertificado(ins) && h("button", { type: "button", class: "btn btn-outline-danger", onClick: () => anularCertificado(ins.id, nombreCompleto(p)) },
        h("i", { class: "bi bi-x-octagon me-1" }), "Anular certificado"),
      h("button", { type: "button", class: "btn btn-secondary ms-auto", "data-bs-dismiss": "modal" }, "Cerrar"),
    ),
  );

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalContactoAlumno")).show();
}

// Vuelve a dibujar todo lo que depende del estado de los alumnos
function redibujarAlumnos() {
  dibujarMetricasAlumnos(cursoActual);
  dibujarAvisoCertificados();
  dibujarFiltrosAlumnos();
  dibujarAlumnos();
}

// Aviso fijo: cómo funcionan los certificados y cuántos alumnos esperan uno
function dibujarAvisoCertificados() {
  const pendientes = alumnos.filter((a) => a.estado === "Finalizado" && !tieneCertificado(a) && !a.certificado?.anulado).length;
  const aviso = document.getElementById("avisoCertificados");
  aviso.className = `aviso-certificados mt-4${pendientes ? " con-pendientes" : ""}`;
  aviso.replaceChildren(
    h("i", { class: `bi ${pendientes ? "bi-exclamation-circle-fill" : "bi-shield-check"}` }),
    h("div", {},
      h("strong", { class: "d-block" },
        pendientes
          ? `${pendientes} ${pendientes === 1 ? "alumno terminó" : "alumnos terminaron"} la cursada y ${pendientes === 1 ? "espera" : "esperan"} tu decisión`
          : "Vos decidís quién recibe el certificado"),
      h("span", { class: "d-block" }, "Terminar la cursada no da el certificado automáticamente: emitilo sólo a quienes cumplieron (asistencia, trabajos, evaluaciones). Cada certificado tiene un código QR que cualquiera puede verificar."),
      pendientes > 0 &&
        h("button", { type: "button", class: "btn btn-sm btn-warning mt-2", onClick: () => {
          filtroAlumnos = "por_certificar";
          dibujarFiltrosAlumnos();
          dibujarAlumnos();
          document.getElementById("listaAlumnos").scrollIntoView({ behavior: "smooth", block: "start" });
        } }, h("i", { class: "bi bi-funnel me-1" }), "Ver alumnos por certificar"),
    ),
  );
}

async function emitirCertificado(inscripcionId, nombre = "este alumno") {
  bootstrap.Modal.getInstance(document.getElementById("modalContactoAlumno"))?.hide();
  const confirmado = await confirmarAccion(
    `¿Confirmás que ${nombre} cumplió con el curso (asistencia y evaluaciones)? Se le va a emitir el certificado con código QR y va a poder descargarlo.`,
    { titulo: "Emitir certificado", textoConfirmar: "Sí, emitir certificado", peligroso: false },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/inscripciones/${inscripcionId}/certificado`, { method: "POST" });
  if (!ok) return mostrarToast(data.mensaje || "No se pudo emitir el certificado", "error");
  mostrarToast(`Certificado emitido para ${nombre}`, "exito");
  const ins = alumnos.find((a) => a.id === inscripcionId);
  if (ins) Object.assign(ins, { estado: "Finalizado", certificado: data.certificado });
  redibujarAlumnos();
}

async function anularCertificado(inscripcionId, nombre = "este alumno") {
  bootstrap.Modal.getInstance(document.getElementById("modalContactoAlumno"))?.hide();
  const confirmado = await confirmarAccion(
    `¿Anular el certificado de ${nombre}? Ya no va a poder descargarlo y, si alguien escanea el QR, va a figurar como anulado. Podés volver a emitirlo después.`,
    { titulo: "Anular certificado", textoConfirmar: "Sí, anular", peligroso: true },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/inscripciones/${inscripcionId}/certificado`, { method: "DELETE" });
  if (!ok) return mostrarToast(data.mensaje || "No se pudo anular el certificado", "error");
  mostrarToast(`Se anuló el certificado de ${nombre}`, "exito");
  const ins = alumnos.find((a) => a.id === inscripcionId);
  if (ins?.certificado) ins.certificado.anulado = true;
  redibujarAlumnos();
}

// Cierra la cursada SIN certificado (por ejemplo, si no asistió o no aprobó)
async function marcarFinalizado(inscripcionId, nombre = "este alumno") {
  bootstrap.Modal.getInstance(document.getElementById("modalContactoAlumno"))?.hide();
  const confirmado = await confirmarAccion(
    `¿Cerrar la cursada de ${nombre} sin certificado? Queda como "Finalizado" pero no va a poder descargar un certificado. Si después cambiás de idea, podés emitírselo.`,
    { titulo: "Cerrar sin certificado", textoConfirmar: "Sí, cerrar", peligroso: false },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/inscripciones/${inscripcionId}`, {
    method: "PUT",
    body: { estado: "Finalizado" },
  });
  if (ok) {
    mostrarToast(`Se cerró la cursada de ${nombre}`, "exito");
    const ins = alumnos.find((a) => a.id === inscripcionId);
    if (ins) ins.estado = "Finalizado";
    redibujarAlumnos();
  } else {
    mostrarToast(data.mensaje || "No se pudo actualizar el estado", "error");
  }
}
