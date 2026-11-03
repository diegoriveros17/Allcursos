// assets/js/app.js
// Listado de cursos del inicio: buscador, panel de filtros (modalidad y categoría), orden y tarjetas.
const contenedor = document.querySelector("#cardCursos");

const IMAGEN_POR_DEFECTO = "assets/img/curso_programacion.webp";
const MODALIDADES = [
  { valor: "Presencial", icono: "bi-geo-alt" },
  { valor: "Virtual", icono: "bi-laptop" },
  { valor: "Híbrido", icono: "bi-shuffle" },
];

// Escapa texto antes de meterlo en HTML (títulos y descripciones los cargan los usuarios)
const escapar = (texto = "") =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const tarjetaCurso = (curso) => {
  const institucion = curso.institucion ? curso.institucion.nombre : "Institución";
  const categoria = curso.categoria ? curso.categoria.nombre : "";
  const cupos = curso.cupos_disponibles;
  const sinCupos = cupos === 0;
  const imagen = curso.imagen_url ? curso.imagen_url : IMAGEN_POR_DEFECTO;
  const icono = (MODALIDADES.find((m) => m.valor === curso.modalidad) || MODALIDADES[0]).icono;
  const enlace = `detalles.html?id=${encodeURIComponent(curso.id)}`;

  return `<div class="col">
            <article class="card curso-card h-100">
              <div class="curso-card-imagen">
                <img src="${escapar(imagen)}" alt="${escapar(curso.titulo)}" loading="lazy" />
                ${cupos !== undefined && cupos !== null
                  ? `<span class="curso-card-vacantes ${sinCupos ? "sin-vacantes" : ""}">
                       <i class="bi ${sinCupos ? "bi-x-circle" : "bi-people"} me-1"></i>${sinCupos ? "Sin vacantes" : `${cupos} vacantes`}
                     </span>`
                  : ""}
              </div>
              <div class="card-body d-flex flex-column">
                <div class="curso-card-meta">
                  <i class="bi ${icono}"></i>${escapar(curso.modalidad)}
                  ${curso.duracion_horas ? `<span class="punto">·</span>${escapar(curso.duracion_horas)} h` : ""}
                </div>
                <h5 class="card-title curso-card-titulo">
                  <a href="${enlace}" class="stretched-link">${escapar(curso.titulo)}</a>
                </h5>
                <p class="curso-card-descripcion">${escapar(curso.descripcion)}</p>
                <div class="curso-card-pie mt-auto">
                  <span class="curso-card-institucion text-truncate"><i class="bi bi-building me-1"></i>${escapar(institucion)}</span>
                  ${categoria ? `<span class="badge curso-card-categoria">${escapar(categoria)}</span>` : ""}
                </div>
                <span class="curso-card-ver">Ver detalles<i class="bi bi-arrow-right ms-1"></i></span>
              </div>
            </article>
          </div>`;
};

// Tarjetas "fantasma" mientras cargan los cursos
const tarjetasCargando = () =>
  Array.from({ length: 6 }, () => `
    <div class="col">
      <div class="card h-100 curso-card esqueleto">
        <div class="curso-card-imagen esqueleto-bloque"></div>
        <div class="card-body">
          <div class="esqueleto-bloque mb-3" style="width: 40%; height: .8rem;"></div>
          <div class="esqueleto-bloque mb-2" style="width: 90%; height: 1.1rem;"></div>
          <div class="esqueleto-bloque mb-4" style="width: 70%; height: .8rem;"></div>
          <div class="esqueleto-bloque" style="width: 55%; height: .8rem;"></div>
        </div>
      </div>
    </div>`).join("");

const mostrarMensaje = (mensaje, { conBoton = false } = {}) => {
  contenedor.innerHTML = `<div class="col-12 w-100">
                            <div class="estado-vacio">
                              <i class="bi bi-search"></i>
                              <h5>${escapar(mensaje)}</h5>
                              <p class="text-muted mb-3">Probá con otras palabras o quitá algunos filtros.</p>
                              ${conBoton ? `<button type="button" class="btn btn-outline-primary btn-sm" data-accion="limpiar-filtros">Borrar filtros</button>` : ""}
                            </div>
                          </div>`;
};

const cargarCursos = (listaCursos) => {
  if (!listaCursos.length) {
    mostrarMensaje("No encontramos cursos", { conBoton: hayFiltrosActivos() });
    return;
  }
  contenedor.innerHTML = listaCursos.map(tarjetaCurso).join("");
};

let cursosCache = [];
let categoriasCache = [];

async function iniciarListadoCursos() {
  contenedor.innerHTML = tarjetasCargando();
  const [respCursos, respCategorias] = await Promise.all([
    apiFetch("/cursos", { auth: false }),
    apiFetch("/categorias", { auth: false }),
  ]);
  if (!respCursos.ok) {
    contadorResultados.textContent = "";
    mostrarMensaje(respCursos.data.mensaje || "No se pudieron cargar los cursos");
    return;
  }
  cursosCache = respCursos.data.cursos || [];
  categoriasCache = respCategorias.ok ? respCategorias.data.categorias || [] : [];
  dibujarOpcionesFiltro();
  aplicarFiltros();
}

document.addEventListener("DOMContentLoaded", iniciarListadoCursos);

// --- Filtros: búsqueda de texto + categorías + modalidades (se pueden marcar varias) + orden ---
const inputBusqueda = document.getElementById("terminoBusqueda");
const formBuscador = document.getElementById("formBuscador");
const listaModalidades = document.getElementById("listaModalidades");
const listaCategorias = document.getElementById("listaCategorias");
const selectOrden = document.getElementById("ordenCursos");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const contadorFiltros = document.getElementById("contadorFiltros");
const chipsFiltros = document.getElementById("chipsFiltros");
const contadorResultados = document.getElementById("contadorResultados");

const filtros = { categorias: new Set(), modalidades: new Set() };

const hayFiltrosActivos = () =>
  Boolean(inputBusqueda?.value.trim()) || filtros.categorias.size > 0 || filtros.modalidades.size > 0;

// Una opción con checkbox y la cantidad de cursos que tiene
const opcionFiltro = (tipo, valor, texto, cantidad, icono = "") => `
  <label class="opcion-filtro ${cantidad === 0 ? "vacia" : ""}">
    <input class="form-check-input" type="checkbox" data-tipo="${tipo}" value="${escapar(valor)}" />
    <span class="opcion-texto">${icono ? `<i class="bi ${icono}"></i>` : ""}${escapar(texto)}</span>
    <span class="opcion-cantidad">${cantidad}</span>
  </label>`;

function dibujarOpcionesFiltro() {
  if (listaModalidades) {
    listaModalidades.innerHTML = MODALIDADES.map((m) =>
      opcionFiltro("modalidades", m.valor, m.valor, cursosCache.filter((c) => c.modalidad === m.valor).length, m.icono),
    ).join("");
  }
  if (listaCategorias) {
    const opciones = categoriasCache
      .map((cat) => ({ cat, cantidad: cursosCache.filter((c) => String(c.categoria_id) === String(cat.id)).length }))
      .sort((a, b) => b.cantidad - a.cantidad); // Las categorías con más cursos, primero
    listaCategorias.innerHTML = opciones.length
      ? opciones.map(({ cat, cantidad }) => opcionFiltro("categorias", cat.id, cat.nombre, cantidad)).join("")
      : `<p class="small text-muted mb-0">No hay categorías cargadas.</p>`;
  }
}

function ordenarCursos(lista) {
  const orden = selectOrden?.value || "recomendados";
  const copia = [...lista];
  if (orden === "titulo") copia.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  if (orden === "populares") copia.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  if (orden === "vacantes") copia.sort((a, b) => (b.cupos_disponibles ?? -1) - (a.cupos_disponibles ?? -1));
  return copia;
}

// Chips de los filtros activos, cada uno con su "x" para quitarlo
function dibujarChips() {
  const chips = [];
  filtros.modalidades.forEach((m) => chips.push({ tipo: "modalidades", valor: m, texto: m }));
  filtros.categorias.forEach((id) => {
    const cat = categoriasCache.find((c) => String(c.id) === id);
    chips.push({ tipo: "categorias", valor: id, texto: cat ? cat.nombre : id });
  });
  const cantidad = chips.length;
  chipsFiltros.innerHTML = chips
    .map((c) => `<span class="chip-filtro">${escapar(c.texto)}<button type="button" aria-label="Quitar filtro ${escapar(c.texto)}" data-tipo="${c.tipo}" data-valor="${escapar(c.valor)}"><i class="bi bi-x"></i></button></span>`)
    .join("");
  chipsFiltros.classList.toggle("d-none", cantidad === 0);
  contadorFiltros.textContent = cantidad;
  contadorFiltros.classList.toggle("d-none", cantidad === 0);
  btnLimpiarFiltros.classList.toggle("d-none", !hayFiltrosActivos());
}

function aplicarFiltros() {
  const terminoBusqueda = (inputBusqueda?.value || "").trim().toUpperCase();

  const cursosFiltrados = cursosCache.filter((curso) => {
    const coincideTexto =
      !terminoBusqueda ||
      curso.titulo.toUpperCase().includes(terminoBusqueda) ||
      (curso.institucion?.nombre || "").toUpperCase().includes(terminoBusqueda) ||
      (curso.categoria?.nombre || "").toUpperCase().includes(terminoBusqueda);

    const coincideCategoria = !filtros.categorias.size || filtros.categorias.has(String(curso.categoria_id));
    const coincideModalidad = !filtros.modalidades.size || filtros.modalidades.has(curso.modalidad);

    return coincideTexto && coincideCategoria && coincideModalidad;
  });

  const total = cursosCache.length;
  contadorResultados.innerHTML = cursosFiltrados.length === total
    ? `<strong>${total}</strong> ${total === 1 ? "curso disponible" : "cursos disponibles"}`
    : `<strong>${cursosFiltrados.length}</strong> de ${total} cursos`;

  dibujarChips();
  cargarCursos(ordenarCursos(cursosFiltrados));
}

function limpiarFiltros() {
  if (inputBusqueda) inputBusqueda.value = "";
  filtros.categorias.clear();
  filtros.modalidades.clear();
  document.querySelectorAll(".opcion-filtro input").forEach((input) => (input.checked = false));
  aplicarFiltros();
}

// Marcar / desmarcar un checkbox del panel
document.querySelector(".panel-filtros")?.addEventListener("change", (e) => {
  const input = e.target.closest("input[data-tipo]");
  if (!input) return;
  const conjunto = filtros[input.dataset.tipo];
  input.checked ? conjunto.add(input.value) : conjunto.delete(input.value);
  aplicarFiltros();
});

// Quitar un filtro desde su chip
chipsFiltros?.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-tipo]");
  if (!boton) return;
  filtros[boton.dataset.tipo].delete(boton.dataset.valor);
  const input = document.querySelector(`.opcion-filtro input[data-tipo="${boton.dataset.tipo}"][value="${CSS.escape(boton.dataset.valor)}"]`);
  if (input) input.checked = false;
  aplicarFiltros();
});

// Botón "Borrar filtros" del estado vacío
contenedor?.addEventListener("click", (e) => {
  if (e.target.closest('[data-accion="limpiar-filtros"]')) limpiarFiltros();
});

inputBusqueda?.addEventListener("input", aplicarFiltros);
selectOrden?.addEventListener("change", aplicarFiltros);
btnLimpiarFiltros?.addEventListener("click", limpiarFiltros);

// Al apretar "Buscar cursos" (o Enter) baja hasta los resultados
formBuscador?.addEventListener("submit", (e) => {
  e.preventDefault();
  aplicarFiltros();
  document.getElementById("cursos")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("DOMContentLoaded", () => {
  const contenedorFade = document.getElementById("page-container-1");
  setTimeout(() => {
    contenedorFade?.classList.add("fade-in");
  }, 10);
});
