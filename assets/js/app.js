// assets/js/app.js
const contenedor = document.querySelector("#cardCursos");

const IMAGEN_POR_DEFECTO = "assets/img/curso_programacion.webp";

const tarjetaCurso = (curso) => {
  const institucion = curso.institucion ? curso.institucion.nombre : "Institución";
  const categoria = curso.categoria ? curso.categoria.nombre : "";
  const cupos = curso.cupos_disponibles;
  const sinCupos = cupos === 0;
  const imagen = curso.imagen_url ? curso.imagen_url : IMAGEN_POR_DEFECTO;

  return `<div class="col col-lg-4 col-md-6 col-sm-6">
                <div class="card h-100" style="max-width: 24rem;">
                  <img src="${imagen}" class="card-img-top" alt="${curso.titulo}" style="height: 14rem; object-fit: cover;"/>
                  <div class="card-body d-flex flex-column">
                    <div>
                        <span class="badge bg-secondary mb-2">${institucion}</span>
                        ${categoria ? `<span class="badge bg-info text-dark mb-2 ms-1">${categoria}</span>` : ""}
                        <h5 class="card-title text-start">${curso.titulo}</h5>
                        <p class="card-text text-start text-muted small text-truncate m-0 p-0">
                        <b>Descripción: </b> ${curso.descripcion}
                        </p>
                        <p class="text-start text-muted small m-0 p-0">
                        <b>Modalidad: </b> ${curso.modalidad}
                        </p>
                        ${
                          curso.fecha_inicio
                            ? `<p class="text-start text-muted small m-0 p-0">
                                <b>Inicia: </b> ${new Date(curso.fecha_inicio + "T00:00:00").toLocaleDateString("es-AR")}
                               </p>`
                            : ""
                        }
                        <p class="text-start text-muted small m-0 p-0">
                        <b>Vacantes disponibles: </b> ${sinCupos ? "Sin vacantes" : cupos}
                        </p>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-auto pt-3">
                      <div class="btn-group">
                        <a type="button" class="btn btn-sm btn-outline-secondary" href="detalles.html?id=${curso.id}">
                          Ver más detalles
                        </a>
                      </div>
                      <small class="text-body-secondary"></small>
                    </div>
                  </div>
                </div>
    </div>`;
};

const mostrarMensaje = (mensaje) => {
  contenedor.innerHTML = `<div class="row justify-content-center">
                              <div class="col-sm-12">
                                  <div class="alert alert-danger" role="alert">
                                    ${mensaje}
                                  </div>
                               </div>
                             </div>`;
};

const cargarCursos = (listaCursos) => {
  if (!listaCursos.length) {
    mostrarMensaje("No se encontraron cursos con esos filtros");
    return;
  }
  contenedor.innerHTML = listaCursos.map(tarjetaCurso).join("");
};

let cursosCache = [];

async function iniciarListadoCursos() {
  contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>`;
  const { ok, data } = await apiFetch("/cursos", { auth: false });
  if (!ok) {
    mostrarMensaje(data.mensaje || "No se pudieron cargar los cursos");
    return;
  }
  cursosCache = data.cursos || [];
  cargarCursos(cursosCache);
}

document.addEventListener("DOMContentLoaded", iniciarListadoCursos);

// --- Filtros: búsqueda de texto + categoría + modalidad, combinados ---
const inputBusqueda = document.getElementById("terminoBusqueda");
const selectFiltroCategoria = document.getElementById("filtroCategoria");
const selectFiltroModalidad = document.getElementById("filtroModalidad");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const formBuscarCurso = document.querySelector("#formBuscar");

async function cargarCategoriasEnFiltro() {
  if (!selectFiltroCategoria) return;
  const { ok, data } = await apiFetch("/categorias", { auth: false });
  if (!ok) return;
  (data.categorias || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.nombre;
    selectFiltroCategoria.appendChild(option);
  });
}

function aplicarFiltros() {
  const terminoBusqueda = (inputBusqueda?.value || "").toUpperCase();
  const categoriaId = selectFiltroCategoria?.value || "";
  const modalidad = selectFiltroModalidad?.value || "";

  const cursosFiltrados = cursosCache.filter((curso) => {
    const coincideTexto =
      !terminoBusqueda ||
      curso.titulo.toUpperCase().includes(terminoBusqueda) ||
      (curso.institucion?.nombre || "").toUpperCase().includes(terminoBusqueda) ||
      (curso.categoria?.nombre || "").toUpperCase().includes(terminoBusqueda);

    const coincideCategoria = !categoriaId || String(curso.categoria_id) === categoriaId;
    const coincideModalidad = !modalidad || curso.modalidad === modalidad;

    return coincideTexto && coincideCategoria && coincideModalidad;
  });

  cargarCursos(cursosFiltrados);
}

if (formBuscarCurso) {
  formBuscarCurso.addEventListener("submit", (e) => e.preventDefault());
  inputBusqueda?.addEventListener("input", aplicarFiltros);
}
selectFiltroCategoria?.addEventListener("change", aplicarFiltros);
selectFiltroModalidad?.addEventListener("change", aplicarFiltros);
btnLimpiarFiltros?.addEventListener("click", () => {
  if (inputBusqueda) inputBusqueda.value = "";
  if (selectFiltroCategoria) selectFiltroCategoria.value = "";
  if (selectFiltroModalidad) selectFiltroModalidad.value = "";
  cargarCursos(cursosCache);
});

document.addEventListener("DOMContentLoaded", cargarCategoriasEnFiltro);

window.addEventListener("DOMContentLoaded", () => {
  const contenedorFade = document.getElementById("page-container-1");
  setTimeout(() => {
    contenedorFade?.classList.add("fade-in");
  }, 10);
});

document.addEventListener("DOMContentLoaded", () => {
  const botonCursos = document.querySelector('a[href="#cursos"]');
  const seccionCursos = document.getElementById("cursos");

  if (botonCursos && seccionCursos) {
    botonCursos.addEventListener("click", function (evento) {
      evento.preventDefault();
      seccionCursos.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
});
