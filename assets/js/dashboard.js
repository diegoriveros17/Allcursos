document.addEventListener("DOMContentLoaded", () => {
  const sesion = obtenerSesion();

  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  const panelCiudadano = document.getElementById("dashCiudadano");
  const panelRepresentante = document.getElementById("dashRepresentante");

  const tituloPanel = document.getElementById("saludoUsuario");
  const bajadaPanel = document.querySelector(".container.my-5.pt-5 p.text-muted");
  const infoPerfilCiudadano = document.getElementById("infoPerfilCiudadano");

  if (sesion.rol === "administrador") {
    window.location.href = "admin.html";
    return;
  }

  if (sesion.rol === "ciudadano") {
    if (tituloPanel) tituloPanel.textContent = `¡Hola, ${sesion.nombre}!`;
    if (bajadaPanel)
      bajadaPanel.textContent =
        "Bienvenido/a. Desde aquí puedes ver tus inscripciones y descargar tus certificados.";

    if (infoPerfilCiudadano) {
      infoPerfilCiudadano.innerHTML = `
        <p class="mb-1"><strong>Nombre:</strong> ${sesion.nombre} ${sesion.apellido}</p>
        <p class="mb-1"><strong>Email:</strong> ${sesion.email_login}</p>
        ${sesion.dni ? `<p class="mb-1"><strong>DNI:</strong> ${sesion.dni}</p>` : ""}
        <span class="badge bg-primary mt-2">Ciudadano</span>
      `;
    }

    panelCiudadano?.classList.remove("d-none");
    panelRepresentante?.classList.add("d-none");
    cargarTablaCiudadano();
    cargarEncuestasCiudadano();
  } else if (sesion.rol === "representante") {
    if (tituloPanel) tituloPanel.textContent = "Panel Institucional / Representante";
    if (bajadaPanel)
      bajadaPanel.textContent =
        "Bienvenido/a. Desde aquí puedes administrar la oferta de cursos de tu institución.";

    const alertaEstado = document.getElementById("alertaEstadoRepresentante");
    const btnNuevoCurso = document.getElementById("btnAbrirNuevoCurso");

    if (sesion.estado_aprobacion === "pendiente") {
      if (alertaEstado) {
        alertaEstado.classList.remove("d-none");
        alertaEstado.innerHTML = `
          <div class="alert alert-warning border-start border-warning border-4 shadow-sm" role="alert">
            <h5 class="alert-heading fw-bold mb-1">
              <i class="bi bi-hourglass-split me-2"></i>Cuenta de Representante en Proceso de Aprobación
            </h5>
            <p class="mb-1">
              Tu solicitud para representar a <strong>${sesion.institucion?.nombre || "tu institución"}</strong> está siendo revisada por los administradores.
            </p>
            <p class="mb-0 small text-muted">
              Por razones de seguridad y verificación de legitimidad, no podrás publicar cursos hasta que tu cuenta sea aprobada.
            </p>
          </div>`;
      }
      if (btnNuevoCurso) {
        btnNuevoCurso.classList.add("disabled");
        btnNuevoCurso.setAttribute("disabled", "true");
        btnNuevoCurso.setAttribute("title", "Tu cuenta está pendiente de aprobación");
      }
    } else if (sesion.estado_aprobacion === "rechazado") {
      if (alertaEstado) {
        alertaEstado.classList.remove("d-none");
        alertaEstado.innerHTML = `
          <div class="alert alert-danger border-start border-danger border-4 shadow-sm" role="alert">
            <h5 class="alert-heading fw-bold mb-1"><i class="bi bi-x-circle me-2"></i>Solicitud Rechazada</h5>
            <p class="mb-0">Tu solicitud como representante fue rechazada por la administración.</p>
          </div>`;
      }
      if (btnNuevoCurso) {
        btnNuevoCurso.classList.add("disabled");
        btnNuevoCurso.setAttribute("disabled", "true");
      }
    }

    panelRepresentante?.classList.remove("d-none");
    panelCiudadano?.classList.add("d-none");
    cargarTablaRepresentante();
    prepararFormularioNuevoCurso();
    prepararFormularioNuevaEncuesta();
    cargarEncuestasRepresentante();
    cargarConsultasRepresentante();
  } else {
    if (tituloPanel) tituloPanel.textContent = "Mi Panel de Control";
    panelCiudadano?.classList.remove("d-none");
  }
});

// ==========================================
// CIUDADANO: mis cursos + lista de espera + certificados
// ==========================================
async function cargarTablaCiudadano() {
  const tbody = document.getElementById("tablaInscripcionesCiudadano");
  if (!tbody) return;

  const { ok, data } = await apiFetch("/inscripciones/mias");
  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">${data.mensaje || "No se pudieron cargar tus cursos"}</td></tr>`;
    return;
  }

  const inscripciones = data.inscripciones || [];
  if (inscripciones.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-3">
          No estás inscripto en ningún curso actualmente.
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = inscripciones
      .map((item) => {
        const curso = item.curso || {};
        const institucion = curso.institucion ? curso.institucion.nombre : "";
        const estado = item.estado;
        const badgeClase =
          estado === "Finalizado"
            ? "bg-success"
            : estado === "Cancelado"
              ? "bg-secondary"
              : estado === "En espera"
                ? "bg-warning text-dark"
                : "bg-primary";

        const acciones =
          estado === "Finalizado"
            ? `<button class="btn btn-sm btn-outline-success" onclick="descargarCertificado(${item.id})">
                 <i class="bi bi-file-earmark-pdf"></i> Certificado
               </button>`
            : estado !== "Cancelado"
              ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelarInscripcion(${item.id})">Cancelar</button>`
              : "";

        return `
      <tr>
        <td>${curso.titulo || "Curso"}</td>
        <td>${institucion}</td>
        <td><span class="badge ${badgeClase}">${estado}</span></td>
        <td>${acciones}</td>
      </tr>
    `;
      })
      .join("");
  }

  const listaEspera = data.listaEspera || [];
  const cardListaEspera = document.getElementById("cardListaEspera");
  const contenedorListaEspera = document.getElementById("listaEsperaCiudadano");
  if (cardListaEspera && contenedorListaEspera) {
    if (listaEspera.length === 0) {
      cardListaEspera.classList.add("d-none");
    } else {
      cardListaEspera.classList.remove("d-none");
      contenedorListaEspera.innerHTML = listaEspera
        .map(
          (le) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          ${le.curso?.titulo || "Curso"}
          <span class="badge bg-warning text-dark">En espera</span>
        </li>`,
        )
        .join("");
    }
  }
}

async function cancelarInscripcion(id) {
  const confirmado = await confirmarAccion("¿Seguro que deseas cancelar esta inscripción?", {
    titulo: "Cancelar inscripción",
    textoConfirmar: "Sí, cancelar",
  });
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/inscripciones/${id}`, {
    method: "PUT",
    body: { estado: "Cancelado" },
  });
  if (ok) {
    mostrarToast("Inscripción cancelada", "info");
    cargarTablaCiudadano();
  } else {
    mostrarToast(data.mensaje || "No se pudo cancelar la inscripción", "error");
  }
}

// La descarga del PDF necesita el header Authorization, por eso no puede ser
// un simple <a href>: se pide como blob y se dispara la descarga manualmente.
async function descargarCertificado(inscripcionId) {
  const token = localStorage.getItem("token");
  try {
    const respuesta = await fetch(
      `${window.location.origin}/api/inscripciones/${inscripcionId}/certificado`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      mostrarToast(data.mensaje || "No se pudo descargar el certificado", "error");
      return;
    }
    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificado_${inscripcionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    mostrarToast("No se pudo conectar con el servidor para descargar el certificado", "error");
  }
}

// ==========================================
// CIUDADANO: encuestas disponibles
// (la lógica vive en encuesta_responder.js: cargarEncuestasCiudadano)
// ==========================================

// ==========================================
// REPRESENTANTE: sus cursos + alta de curso
// ==========================================
async function cargarTablaRepresentante() {
  const tbody = document.getElementById("tablaCursosRepresentante");
  const metricas = document.getElementById("metricasRepresentante");
  if (!tbody) return;

  const { ok, data } = await apiFetch("/cursos/mis-cursos");
  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">${data.mensaje || "No se pudieron cargar tus cursos"}</td></tr>`;
    return;
  }

  const cursos = data.cursos || [];
  window.__misCursos = cursos;
  const totalInscriptos = cursos.reduce((acc, c) => acc + (c.inscriptos || 0), 0);

  if (metricas) {
    metricas.innerHTML = `
      <div class="col-md-6">
        <div class="card bg-primary text-white shadow-sm border-0 mb-3">
          <div class="card-body">
            <h6 class="card-title">Total Cursos Publicados</h6>
            <h3 class="fw-bold mb-0">${cursos.length}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card bg-success text-white shadow-sm border-0 mb-3">
          <div class="card-body">
            <h6 class="card-title">Total Inscriptos</h6>
            <h3 class="fw-bold mb-0">${totalInscriptos}</h3>
          </div>
        </div>
      </div>
    `;
  }

  if (cursos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-3">
          No has publicado ningún curso todavía.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = cursos
    .map(
      (curso) => `
    <tr>
      <td>
        ${curso.imagen_url ? `<img src="${curso.imagen_url}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" class="me-2">` : ""}
        ${curso.titulo}
      </td>
      <td>${curso.cupo_maximo}</td>
      <td>${curso.inscriptos || 0}</td>
      <td>
        <a class="btn btn-sm btn-outline-primary" href="alumnos_x_curso.html?id=${curso.id}">
          <i class="bi bi-people-fill"></i> Ver Alumnos
        </a>
        <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalEditarCurso(${curso.id})">
          <i class="bi bi-pencil-square"></i> Editar
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarCurso(${curso.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");

  // Recargamos las opciones de "curso a evaluar" del modal de encuestas
  const selectCurso = document.getElementById("encuestaCurso");
  if (selectCurso) {
    selectCurso.innerHTML =
      `<option value="">Seleccionar...</option>` +
      cursos.map((c) => `<option value="${c.id}">${c.titulo}</option>`).join("");
  }
}

async function eliminarCurso(id) {
  const confirmado = await confirmarAccion(
    "¿Seguro que deseas eliminar este curso? Esta acción no se puede deshacer.",
    { titulo: "Eliminar curso", textoConfirmar: "Sí, eliminar" },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/cursos/${id}`, { method: "DELETE" });
  if (ok) {
    mostrarToast("Curso eliminado", "info");
    cargarTablaRepresentante();
  } else {
    mostrarToast(data.mensaje || "No se pudo eliminar el curso", "error");
  }
}

let cursoEditandoId = null;

async function cargarCategoriasEnSelect() {
  const selectCategoria = document.getElementById("cursoCategoria");
  if (!selectCategoria) return;

  selectCategoria.innerHTML = `<option value="">Seleccionar...</option>`;
  const { ok, data } = await apiFetch("/categorias", { auth: false });
  if (ok) {
    (data.categorias || []).forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nombre;
      selectCategoria.appendChild(option);
    });
  }
  const opcionNueva = document.createElement("option");
  opcionNueva.value = "__nueva__";
  opcionNueva.textContent = "+ Agregar categoría nueva...";
  selectCategoria.appendChild(opcionNueva);
}

async function cargarRequisitosEnFormulario(idsSeleccionados = []) {
  const contenedorRequisitos = document.getElementById("cursoRequisitos");
  if (!contenedorRequisitos) return;

  const { ok, data } = await apiFetch("/requisitos", { auth: false });
  if (!ok) return;

  const requisitos = data.requisitos || [];
  contenedorRequisitos.innerHTML = requisitos.length
    ? requisitos
        .map(
          (r) => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${r.id}" id="req-${r.id}" ${idsSeleccionados.includes(r.id) ? "checked" : ""}>
        <label class="form-check-label small" for="req-${r.id}">${r.descripcion}</label>
      </div>
    `,
        )
        .join("")
    : `<p class="text-muted small mb-0">Todavía no hay requisitos cargados en el sistema.</p>`;
}

let institucionIdModal = null; // NUEVO: id de la institución del representante (para guardar su ubicación)
let ubicacionGuardada = ""; // NUEVO: texto de ubicación que ya estaba guardado (para saber si el usuario lo cambió)
let pinGuardado = null; // NUEVO: pin que ya estaba guardado { latitud, longitud } o null (para saber si lo cambió)

// NUEVO: carga la ubicación guardada de la institución y dibuja su mapa en el modal
async function cargarUbicacionEnModal() { // Función async porque consulta al backend
  const campo = document.getElementById("cursoUbicacionMaps"); // Busca el campo de texto de la ubicación
  if (!campo) return; // Si el modal no tiene el campo, no hace nada
  const { ok, data } = await apiFetch("/auth/me"); // Pide los datos del usuario logueado (incluye su institución)
  if (!ok || !data.usuario?.institucion) return; // Si falló o no tiene institución, corta
  institucionIdModal = data.usuario.institucion.id; // Guarda el id de la institución
  ubicacionGuardada = data.usuario.institucion.ubicacion_maps || ""; // Guarda el texto de ubicación actual
  campo.value = ubicacionGuardada; // Lo muestra en el campo
  const inst = data.usuario.institucion; // Atajo a los datos de la institución
  pinGuardado = inst.latitud != null ? { latitud: inst.latitud, longitud: inst.longitud } : null; // Recuerda el pin guardado (o null si no hay)
  iniciarSelectorPin("cursoSelectorPin", inst.latitud, inst.longitud, (la, lo) => { // Crea el mapa con pin y define qué hacer cuando cambia
    document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(la, lo); // Actualiza el texto de coordenadas
  }); // Cierra la llamada
  document.getElementById("cursoPinCoordenadas").textContent = textoCoordenadas(inst.latitud, inst.longitud); // Muestra las coordenadas iniciales
  setTimeout(() => refrescarMapaLeaflet("cursoSelectorPin"), 400); // Redibuja el mapa por si el modal todavía se estaba abriendo (tamaño 0)
  const respuesta = await apiFetch(`/instituciones/${institucionIdModal}/ubicacion`, { auth: false }); // Pide la URL segura del mapa
  mostrarMapa("cursoMapaPreview", respuesta.ok ? respuesta.data.mapa_embed_url : null); // Dibuja el mapa (o el aviso si no hay)
} // Cierra la función

// NUEVO: buscador de lugares con sugerencias; al elegir una, el pin se mueve ahí
function prepararBuscadorLugares() { // Se llama una vez al preparar el formulario
  const campo = document.getElementById("buscadorLugar"); // Campo de texto del buscador
  const lista = document.getElementById("sugerenciasLugar"); // Lista desplegable de sugerencias
  if (!campo || !lista) return; // Si el modal no tiene el buscador, no hace nada
  let temporizador = null; // Guarda el temporizador para esperar a que el usuario deje de escribir

  const ocultarLista = () => { lista.classList.add("d-none"); lista.innerHTML = ""; }; // Función que vacía y esconde la lista

  campo.addEventListener("input", () => { // Cada vez que el usuario escribe una letra...
    clearTimeout(temporizador); // ...cancela la búsqueda anterior pendiente
    const texto = campo.value.trim(); // Toma lo escrito sin espacios sobrantes
    if (texto.length < 3) { ocultarLista(); return; } // Con menos de 3 letras no busca
    temporizador = setTimeout(async () => { // Espera 600 ms sin escribir para no saturar al servicio (Nominatim pide máx. ~1 búsqueda por segundo)
      const { ok, data } = await apiFetch(`/lugares/buscar?q=${encodeURIComponent(texto)}`); // Pide las sugerencias al backend
      lista.innerHTML = ""; // Vacía la lista anterior
      if (!ok || !data.lugares?.length) { // Si no hubo resultados...
        const vacio = document.createElement("div"); // ...crea un aviso
        vacio.className = "list-group-item text-muted small"; // ...con estilo de item de lista
        vacio.textContent = ok ? "No encontramos ese lugar. Probá con otra dirección o marcá el punto en el mapa." : (data.mensaje || "No se pudo buscar el lugar"); // ...texto del aviso (textContent evita inyectar HTML)
        lista.appendChild(vacio); // ...lo agrega a la lista
        lista.classList.remove("d-none"); // ...y muestra la lista
        return; // ...y termina
      } // Cierra el if
      data.lugares.forEach((lugar) => { // Por cada lugar encontrado...
        const item = document.createElement("button"); // ...crea un botón
        item.type = "button"; // ...que no envía el formulario
        item.className = "list-group-item list-group-item-action small"; // ...con estilo de item clickeable
        item.textContent = lugar.nombre; // ...mostrando el nombre del lugar (textContent evita inyectar HTML)
        item.addEventListener("click", () => { // ...cuando el usuario lo elige...
          moverPin("cursoSelectorPin", lugar.latitud, lugar.longitud); // ...mueve el pin y centra el mapa en ese lugar
          campo.value = lugar.nombre; // ...deja el nombre elegido en el campo
          ocultarLista(); // ...y esconde la lista
        }); // Cierra el click
        lista.appendChild(item); // ...agrega el botón a la lista
      }); // Cierra el forEach
      lista.classList.remove("d-none"); // Muestra la lista con las sugerencias
    }, 600); // Cierra el temporizador (600 ms)
  }); // Cierra el listener input

  document.addEventListener("click", (e) => { // Cuando se hace clic en cualquier parte de la página...
    if (!lista.contains(e.target) && e.target !== campo) ocultarLista(); // ...si fue fuera del buscador, esconde la lista
  }); // Cierra el listener
} // Cierra la función

// NUEVO: si el representante cambió la ubicación, la guarda; devuelve true si todo salió bien
async function guardarUbicacionDelModal() { // Función async porque llama al backend
  const campo = document.getElementById("cursoUbicacionMaps"); // Busca el campo de texto
  if (!campo || !institucionIdModal) return true; // Sin campo o sin institución no hay nada que guardar
  const texto = campo.value.trim(); // Lee el texto sin espacios sobrantes
  const pin = obtenerPin("cursoSelectorPin"); // Lee el pin actual del mapa (o null)
  const pinCambio = (pin?.latitud ?? null) !== (pinGuardado?.latitud ?? null) || (pin?.longitud ?? null) !== (pinGuardado?.longitud ?? null); // Compara con el pin guardado
  if (texto === ubicacionGuardada.trim() && !pinCambio) return true; // Si ni el texto ni el pin cambiaron, no hace falta llamar al backend
  const { ok, data } = await apiFetch(`/instituciones/${institucionIdModal}/ubicacion`, { // Llama al PUT de ubicación
    method: "PUT", // Método PUT porque actualiza un dato
    body: { ubicacion_maps: texto, latitud: pin?.latitud ?? null, longitud: pin?.longitud ?? null }, // Envía el texto escrito y el pin (null si no hay)
  }); // Cierra la llamada
  if (!ok) { // Si el backend rechazó la ubicación...
    document.getElementById("msjNuevoCurso").innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo guardar la ubicación"}</div>`; // ...muestra el error dentro del modal
    return false; // ...e indica que hubo un problema
  } // Cierra el if
  ubicacionGuardada = texto; // Recuerda el nuevo texto guardado
  pinGuardado = pin; // Recuerda el nuevo pin guardado
  mostrarMapa("cursoMapaPreview", data.mapa_embed_url); // Actualiza el mapa del modal
  return true; // Todo salió bien
} // Cierra la función

function resetearModalCurso() {
  cursoEditandoId = null;
  const form = document.getElementById("formNuevoCurso");
  form?.reset();
  document.getElementById("modalNuevoCursoLabel").textContent = "Publicar Nuevo Curso";
  document.getElementById("btnSubmitCurso").textContent = "Publicar Curso";
  document.getElementById("cursoCategoriaNueva").classList.add("d-none");
  document.getElementById("cursoImagenActualWrap").classList.add("d-none");
  document.getElementById("msjNuevoCurso").innerHTML = "";
  cargarRequisitosEnFormulario([]);
  document.getElementById("buscadorLugar").value = ""; // NUEVO: vacía el buscador al abrir el modal
  cargarUbicacionEnModal(); // NUEVO: precarga la ubicación guardada y su mapa
}

// Se llama desde el botón "Editar" de cada fila de la tabla de cursos
async function abrirModalEditarCurso(id) {
  const curso = (window.__misCursos || []).find((c) => c.id === id);
  if (!curso) return;

  cursoEditandoId = id;
  document.getElementById("modalNuevoCursoLabel").textContent = `Editar Curso: ${curso.titulo}`;
  document.getElementById("btnSubmitCurso").textContent = "Guardar Cambios";
  document.getElementById("msjNuevoCurso").innerHTML = "";

  document.getElementById("cursoTitulo").value = curso.titulo || "";
  document.getElementById("cursoDescripcion").value = curso.descripcion || "";
  document.getElementById("cursoModalidad").value = curso.modalidad || "Presencial";
  document.getElementById("cursoCupoMaximo").value = curso.cupo_maximo || "";
  document.getElementById("cursoDuracionHoras").value = curso.duracion_horas || "";
  document.getElementById("cursoCategoria").value = curso.categoria_id || "";
  document.getElementById("cursoCategoriaNueva").classList.add("d-none");
  document.getElementById("cursoImagen").value = "";

  const imagenWrap = document.getElementById("cursoImagenActualWrap");
  if (curso.imagen_url) {
    document.getElementById("cursoImagenActualPreview").src = curso.imagen_url;
    imagenWrap.classList.remove("d-none");
  } else {
    imagenWrap.classList.add("d-none");
  }

  const idsRequisitos = (curso.requisitos || []).map((r) => r.id);
  await cargarRequisitosEnFormulario(idsRequisitos);
  cargarUbicacionEnModal(); // NUEVO: también al editar un curso, muestra la ubicación de la institución

  new bootstrap.Modal(document.getElementById("modalNuevoCurso")).show();
}

async function prepararFormularioNuevoCurso() {
  await cargarCategoriasEnSelect();
  await cargarRequisitosEnFormulario();
  cargarUbicacionEnModal(); // NUEVO: precarga la ubicación al preparar el formulario

  const selectCategoria = document.getElementById("cursoCategoria");
  const inputCategoriaNueva = document.getElementById("cursoCategoriaNueva");
  selectCategoria.addEventListener("change", () => {
    inputCategoriaNueva.classList.toggle("d-none", selectCategoria.value !== "__nueva__");
  });

  document.getElementById("modalNuevoCurso").addEventListener("shown.bs.modal", () => refrescarMapaLeaflet("cursoSelectorPin")); // NUEVO: al terminar de abrirse el modal, redibuja el mapa para que tome su tamaño real
  prepararBuscadorLugares(); // NUEVO: activa el buscador de lugares con sugerencias
  document.getElementById("btnQuitarPinCurso").addEventListener("click", () => quitarPin("cursoSelectorPin")); // NUEVO: el botón "Quitar pin" borra el pin

  const btnAbrirNuevo = document.getElementById("btnAbrirNuevoCurso");
  btnAbrirNuevo?.addEventListener("click", resetearModalCurso);

  const form = document.getElementById("formNuevoCurso");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msj = document.getElementById("msjNuevoCurso");

    // Si eligió "crear categoría nueva", la creamos primero y usamos su id
    let categoriaId = selectCategoria.value;
    if (categoriaId === "__nueva__") {
      const nombreNueva = inputCategoriaNueva.value.trim();
      if (!nombreNueva) {
        msj.innerHTML = `<div class="alert alert-danger py-2">Escribí el nombre de la nueva categoría.</div>`;
        return;
      }
      const { ok: okCat, data: dataCat } = await apiFetch("/categorias", {
        method: "POST",
        body: { nombre: nombreNueva },
      });
      if (!okCat) {
        msj.innerHTML = `<div class="alert alert-danger py-2">${dataCat.mensaje || "No se pudo crear la categoría"}</div>`;
        return;
      }
      categoriaId = dataCat.categoria.id;
    }

    if (!(await guardarUbicacionDelModal())) return; // NUEVO: guarda la ubicación primero; si falla, no sigue con el curso

    const requisitosSeleccionados = Array.from(
      document.querySelectorAll('#cursoRequisitos input[type="checkbox"]:checked'),
    ).map((chk) => Number(chk.value));

    const formData = new FormData();
    formData.append("titulo", document.getElementById("cursoTitulo").value.trim());
    formData.append("descripcion", document.getElementById("cursoDescripcion").value.trim());
    formData.append("categoria_id", categoriaId);
    formData.append("modalidad", document.getElementById("cursoModalidad").value);
    formData.append("cupo_maximo", document.getElementById("cursoCupoMaximo").value);
    formData.append(
      "duracion_horas",
      document.getElementById("cursoDuracionHoras").value || "",
    );
    // Siempre se manda (incluso vacío) para poder sacar requisitos al editar
    formData.append("requisitos", JSON.stringify(requisitosSeleccionados));

    const archivoImagen = document.getElementById("cursoImagen").files[0];
    if (archivoImagen) formData.append("imagen", archivoImagen);

    const editando = !!cursoEditandoId;
    const { ok, data } = await apiFetchForm(
      editando ? `/cursos/${cursoEditandoId}` : "/cursos",
      { method: editando ? "PUT" : "POST", formData },
    );

    if (ok) {
      bootstrap.Modal.getInstance(document.getElementById("modalNuevoCurso"))?.hide();
      resetearModalCurso();
      cargarCategoriasEnSelect();
      cargarTablaRepresentante();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${
        data.mensaje || (data.errores ? data.errores.join(", ") : "No se pudo guardar el curso")
      }</div>`;
    }
  });
}

// ==========================================
// REPRESENTANTE: encuestas
// ==========================================
function prepararFormularioNuevaEncuesta() {
  const radios = document.querySelectorAll('input[name="tipoEncuesta"]');
  const grupoCategoria = document.getElementById("grupoEncuestaCategoria");
  const grupoCurso = document.getElementById("grupoEncuestaCurso");

  const actualizarVisibilidad = () => {
    const tipo = document.querySelector('input[name="tipoEncuesta"]:checked').value;
    grupoCategoria.classList.toggle("d-none", tipo !== "Interes");
    grupoCurso.classList.toggle("d-none", tipo !== "Satisfaccion");
  };
  radios.forEach((r) => r.addEventListener("change", actualizarVisibilidad));
  actualizarVisibilidad();

  const selectCategoria = document.getElementById("encuestaCategoria");
  if (selectCategoria) {
    apiFetch("/categorias", { auth: false }).then(({ ok, data }) => {
      if (ok) {
        (data.categorias || []).forEach((cat) => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.nombre;
          selectCategoria.appendChild(option);
        });
      }
    });
  }

  const form = document.getElementById("formNuevaEncuesta");
  if (!form) return;

  // Constructor dinámico de preguntas (selección múltiple / texto abierto / rating)
  EncuestaBuilder.init("#constructorPreguntas");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = document.querySelector('input[name="tipoEncuesta"]:checked').value;
    const msj = document.getElementById("msjNuevaEncuesta");

    const { errores, preguntas } = EncuestaBuilder.obtenerPreguntas();
    if (errores.length > 0) {
      msj.replaceChildren(h("div", { class: "alert alert-warning py-2" }, errores[0]));
      return;
    }

    const cuerpo = {
      titulo: document.getElementById("encuestaTitulo").value.trim(),
      descripcion: document.getElementById("encuestaDescripcion").value.trim(),
      tipo,
      categoria_id: tipo === "Interes" ? document.getElementById("encuestaCategoria").value || null : null,
      curso_id: tipo === "Satisfaccion" ? document.getElementById("encuestaCurso").value : null,
      preguntas,
    };

    const { ok, data } = await apiFetch("/encuestas", { method: "POST", body: cuerpo });

    if (ok) {
      form.reset();
      EncuestaBuilder.reset();
      msj.replaceChildren();
      bootstrap.Modal.getInstance(document.getElementById("modalNuevaEncuesta"))?.hide();
      mostrarToast("Encuesta publicada", "exito");
      cargarEncuestasRepresentante();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo crear la encuesta"}</div>`;
    }
  });
}

async function cargarEncuestasRepresentante() {
  const contenedor = document.getElementById("listaEncuestasRepresentante");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/encuestas/mias");
  if (!ok) {
    contenedor.innerHTML = `<p class="text-danger small">${data.mensaje || "No se pudieron cargar tus encuestas"}</p>`;
    return;
  }

  const encuestas = data.encuestas || [];
  if (encuestas.length === 0) {
    contenedor.innerHTML = `<p class="text-muted small mb-0">Todavía no creaste ninguna encuesta.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr><th>Título</th><th>Tipo</th><th>Respuestas</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${encuestas
            .map(
              (enc) => `
            <tr>
              <td>${escaparHtml(enc.titulo)}</td>
              <td>${enc.tipo === "Satisfaccion" ? `Satisfacción (${escaparHtml(enc.curso?.titulo || "")})` : `Interés (${escaparHtml(enc.categoria?.nombre || "General")})`}</td>
              <td>${enc.total_respuestas ?? 0}</td>
              <td><span class="badge ${enc.activo ? "bg-success" : "bg-secondary"}">${enc.activo ? "Activa" : "Cerrada"}</span></td>
              <td>
                <a class="btn btn-sm btn-outline-primary" href="estadisticas_encuesta.html?id=${enc.id}"><i class="bi bi-bar-chart-line me-1"></i>Estadísticas</a>
                ${enc.activo ? `<button class="btn btn-sm btn-outline-secondary" onclick="cerrarEncuesta(${enc.id})">Cerrar</button>` : ""}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function cerrarEncuesta(id) {
  const confirmado = await confirmarAccion(
    "¿Cerrar esta encuesta? Ya no se podrán enviar más respuestas.",
    { titulo: "Cerrar encuesta", textoConfirmar: "Sí, cerrar", peligroso: false },
  );
  if (!confirmado) return;
  const { ok, data } = await apiFetch(`/encuestas/${id}/cerrar`, { method: "PUT" });
  if (ok) {
    mostrarToast("Encuesta cerrada", "info");
    cargarEncuestasRepresentante();
  } else {
    mostrarToast(data.mensaje || "No se pudo cerrar la encuesta", "error");
  }
}
