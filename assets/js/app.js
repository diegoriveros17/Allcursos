// Catálogo de cursos de la portada.
// Este archivo solo presenta los datos que devuelve la API; no modifica el backend.
const contenedor = document.querySelector("#cardCursos");
const IMAGEN_POR_DEFECTO = "assets/img/curso_programacion.webp";

function formatoFecha(fecha) {
  if (!fecha) return "A confirmar";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tarjetaCurso(curso) {
  const institucion = curso.institucion?.nombre || "Institución";
  const categoria = curso.categoria?.nombre || "Formación";
  const cupos = curso.cupos_disponibles;
  const disponibilidad = cupos === 0 ? "Sin vacantes" : `${cupos ?? "—"} vacantes`;
  const imagen = curso.imagen_url || IMAGEN_POR_DEFECTO;
  const puedeInscribirse = obtenerSesion()?.rol !== "representante";

  return `
    <div class="col-lg-4 col-md-6">
      <article class="course-card">
        <img src="${imagen}" class="card-img-top" alt="${curso.titulo}" />
        <div class="card-body d-flex flex-column h-100">
          <div class="d-flex flex-wrap gap-1 mb-2">
            <span class="badge text-bg-light border">${institucion}</span>
            <span class="badge text-bg-light border">${categoria}</span>
          </div>
          <h3 class="card-title">${curso.titulo}</h3>
          <p class="card-text text-muted small">${curso.descripcion || "Sin descripción disponible."}</p>
          <div class="small text-muted mt-auto pt-3">
            <div><i class="bi bi-laptop me-1"></i>${curso.modalidad || "Modalidad a confirmar"}</div>
            <div class="mt-1"><i class="bi bi-calendar3 me-1"></i>Inicia: ${formatoFecha(curso.fecha_inicio)}</div>
            <div class="mt-1"><i class="bi bi-people me-1"></i>${disponibilidad}</div>
          </div>
          <div class="course-actions mt-3">
            <a class="btn btn-outline-primary" href="detalles.html?id=${curso.id}"><i class="bi bi-eye"></i> Ver curso</a>
            ${puedeInscribirse ? `<a class="btn btn-brand" href="detalles.html?id=${curso.id}&accion=inscribir"><i class="bi bi-pencil-square"></i> Inscribirme</a>` : ""}
          </div>
        </div>
      </article>
    </div>`;
}

function mostrarMensaje(mensaje, tipo = "warning") {
  if (!contenedor) return;
  contenedor.innerHTML = `<div class="col-12"><div class="alert alert-${tipo} mb-0">${mensaje}</div></div>`;
}

function cargarCursos(listaCursos) {
  if (!listaCursos.length) {
    mostrarMensaje("No encontramos cursos con esos filtros. Probá con otra búsqueda.");
    return;
  }
  contenedor.innerHTML = listaCursos.map(tarjetaCurso).join("");
}

let cursosCache = [];

async function iniciarListadoCursos() {
  if (!contenedor) return;
  contenedor.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando cursos</span></div></div>';
  const { ok, data } = await apiFetch("/cursos", { auth: false });
  if (!ok) {
    mostrarMensaje(data.mensaje || "No se pudieron cargar los cursos.", "danger");
    return;
  }
  cursosCache = data.cursos || [];
  cargarCursos(cursosCache);
}

const inputBusqueda = document.getElementById("terminoBusqueda");
const selectFiltroCategoria = document.getElementById("filtroCategoria");
const selectFiltroModalidad = document.getElementById("filtroModalidad");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const formBuscarCurso = document.querySelector("#formBuscar");

async function cargarCategoriasEnFiltro() {
  if (!selectFiltroCategoria) return;
  const { ok, data } = await apiFetch("/categorias", { auth: false });
  if (!ok) return;
  (data.categorias || []).forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria.id;
    opcion.textContent = categoria.nombre;
    selectFiltroCategoria.appendChild(opcion);
  });
}

function aplicarFiltros() {
  const termino = (inputBusqueda?.value || "").trim().toUpperCase();
  const categoriaId = selectFiltroCategoria?.value || "";
  const modalidad = selectFiltroModalidad?.value || "";
  const resultados = cursosCache.filter((curso) => {
    const textoCurso = `${curso.titulo || ""} ${curso.institucion?.nombre || ""} ${curso.categoria?.nombre || ""}`.toUpperCase();
    return (!termino || textoCurso.includes(termino)) &&
      (!categoriaId || String(curso.categoria_id) === categoriaId) &&
      (!modalidad || curso.modalidad === modalidad);
  });
  cargarCursos(resultados);
}

formBuscarCurso?.addEventListener("submit", (evento) => evento.preventDefault());
inputBusqueda?.addEventListener("input", aplicarFiltros);
selectFiltroCategoria?.addEventListener("change", aplicarFiltros);
selectFiltroModalidad?.addEventListener("change", aplicarFiltros);
btnLimpiarFiltros?.addEventListener("click", () => {
  if (inputBusqueda) inputBusqueda.value = "";
  if (selectFiltroCategoria) selectFiltroCategoria.value = "";
  if (selectFiltroModalidad) selectFiltroModalidad.value = "";
  cargarCursos(cursosCache);
});

document.addEventListener("DOMContentLoaded", () => {
  iniciarListadoCursos();
  cargarCategoriasEnFiltro();
});
