// assets/js/app.js
const contenedor = document.querySelector("#cardCursos");

const tarjetaCurso = (curso) => {
  const institucion = curso.institucion ? curso.institucion.nombre : "Institución";
  const categoria = curso.categoria ? curso.categoria.nombre : "";
  const cupos = curso.cupos_disponibles;
  const sinCupos = cupos === 0;

  return `<div class="col col-lg-4 col-md-6 col-sm-6">
                <div class="card h-100" style="max-width: 24rem;">
                  <img src="assets/img/curso_programacion.webp" class="card-img-top" alt="${curso.titulo}" style="height: 14rem; object-fit: cover;"/>
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
    mostrarMensaje("No se encontraron cursos");
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

const formBuscarCurso = document.querySelector("#formBuscar");
if (formBuscarCurso) {
  formBuscarCurso.addEventListener("submit", (e) => e.preventDefault());
  formBuscarCurso.addEventListener("input", (e) => {
    const terminoBusqueda = e.target.value.toUpperCase();
    const cursoFiltrado = cursosCache.filter((curso) => {
      const titulo = curso.titulo.toUpperCase().includes(terminoBusqueda);
      const institucion = (curso.institucion?.nombre || "")
        .toUpperCase()
        .includes(terminoBusqueda);
      const categoria = (curso.categoria?.nombre || "")
        .toUpperCase()
        .includes(terminoBusqueda);
      return titulo || institucion || categoria;
    });
    cargarCursos(cursoFiltrado);
  });
}

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
