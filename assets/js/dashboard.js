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

    panelRepresentante?.classList.remove("d-none");
    panelCiudadano?.classList.add("d-none");
    cargarTablaRepresentante();
    prepararFormularioNuevoCurso();
    prepararFormularioNuevaEncuesta();
    cargarEncuestasRepresentante();
  } else {
    if (tituloPanel) tituloPanel.textContent = "Mi Panel de Control";
    panelCiudadano?.classList.remove("d-none");
  }

  prepararMiCuenta(sesion);
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
  if (!confirm("¿Seguro que deseas cancelar esta inscripción?")) return;
  const { ok, data } = await apiFetch(`/inscripciones/${id}`, {
    method: "PUT",
    body: { estado: "Cancelado" },
  });
  if (ok) {
    cargarTablaCiudadano();
  } else {
    alert(data.mensaje || "No se pudo cancelar la inscripción");
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
      alert(data.mensaje || "No se pudo descargar el certificado");
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
    alert("No se pudo conectar con el servidor para descargar el certificado");
  }
}

// ==========================================
// CIUDADANO: encuestas disponibles
// ==========================================
async function cargarEncuestasCiudadano() {
  const contenedor = document.getElementById("listaEncuestasCiudadano");
  if (!contenedor) return;

  const { ok, data } = await apiFetch("/encuestas");
  if (!ok) {
    contenedor.innerHTML = `<p class="text-danger small">${data.mensaje || "No se pudieron cargar las encuestas"}</p>`;
    return;
  }

  const encuestas = (data.encuestas || []).filter((e) => !e.yaRespondida);
  if (encuestas.length === 0) {
    contenedor.innerHTML = `<p class="text-muted small mb-0">No tenés encuestas pendientes por ahora.</p>`;
    return;
  }

  contenedor.innerHTML = encuestas
    .map(
      (enc) => `
      <div class="border rounded p-3 mb-2">
        <p class="fw-semibold mb-1">${enc.titulo}</p>
        <p class="text-muted small mb-2">
          ${enc.tipo === "Satisfaccion" ? `Sobre el curso: ${enc.curso?.titulo || ""}` : `Categoría: ${enc.categoria?.nombre || "General"}`}
        </p>
        <div class="input-group input-group-sm">
          <input type="text" class="form-control" placeholder="Tu respuesta..." id="respuesta-${enc.id}">
          <button class="btn btn-primary" onclick="enviarRespuestaEncuesta(${enc.id})">Enviar</button>
        </div>
      </div>
    `,
    )
    .join("");
}

async function enviarRespuestaEncuesta(encuestaId) {
  const input = document.getElementById(`respuesta-${encuestaId}`);
  const respuesta = input ? input.value.trim() : "";
  if (!respuesta) {
    alert("Escribí una respuesta antes de enviar");
    return;
  }
  const { ok, data } = await apiFetch(`/encuestas/${encuestaId}/respuestas`, {
    method: "POST",
    body: { respuesta },
  });
  if (ok) {
    cargarEncuestasCiudadano();
  } else {
    alert(data.mensaje || "No se pudo enviar tu respuesta");
  }
}

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
  if (!confirm("¿Seguro que deseas eliminar este curso?")) return;
  const { ok, data } = await apiFetch(`/cursos/${id}`, { method: "DELETE" });
  if (ok) {
    cargarTablaRepresentante();
  } else {
    alert(data.mensaje || "No se pudo eliminar el curso");
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
  document.getElementById("cursoFechaInicio").value = curso.fecha_inicio || "";
  document.getElementById("cursoFechaFin").value = curso.fecha_fin || "";
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

  new bootstrap.Modal(document.getElementById("modalNuevoCurso")).show();
}

async function prepararFormularioNuevoCurso() {
  await cargarCategoriasEnSelect();
  await cargarRequisitosEnFormulario();

  const selectCategoria = document.getElementById("cursoCategoria");
  const inputCategoriaNueva = document.getElementById("cursoCategoriaNueva");
  selectCategoria.addEventListener("change", () => {
    inputCategoriaNueva.classList.toggle("d-none", selectCategoria.value !== "__nueva__");
  });

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
    formData.append("fecha_inicio", document.getElementById("cursoFechaInicio").value || "");
    formData.append("fecha_fin", document.getElementById("cursoFechaFin").value || "");
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = document.querySelector('input[name="tipoEncuesta"]:checked').value;

    const cuerpo = {
      titulo: document.getElementById("encuestaTitulo").value.trim(),
      tipo,
      categoria_id: tipo === "Interes" ? document.getElementById("encuestaCategoria").value || null : null,
      curso_id: tipo === "Satisfaccion" ? document.getElementById("encuestaCurso").value : null,
    };

    const { ok, data } = await apiFetch("/encuestas", { method: "POST", body: cuerpo });
    const msj = document.getElementById("msjNuevaEncuesta");

    if (ok) {
      form.reset();
      bootstrap.Modal.getInstance(document.getElementById("modalNuevaEncuesta"))?.hide();
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
          <tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${encuestas
            .map(
              (enc) => `
            <tr>
              <td>${enc.titulo}</td>
              <td>${enc.tipo === "Satisfaccion" ? `Satisfacción (${enc.curso?.titulo || ""})` : `Interés (${enc.categoria?.nombre || "General"})`}</td>
              <td><span class="badge ${enc.activo ? "bg-success" : "bg-secondary"}">${enc.activo ? "Activa" : "Cerrada"}</span></td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="verResultadosEncuesta(${enc.id})">Resultados</button>
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

async function verResultadosEncuesta(id) {
  const { ok, data } = await apiFetch(`/encuestas/${id}/resultados`);
  const cuerpo = document.getElementById("cuerpoResultadosEncuesta");
  if (!ok) {
    cuerpo.innerHTML = `<div class="alert alert-danger">${data.mensaje || "No se pudieron cargar los resultados"}</div>`;
  } else {
    cuerpo.innerHTML = `
      <h5>${data.encuesta.titulo}</h5>
      <p class="text-muted">Total de respuestas: <strong>${data.totalRespuestas}</strong></p>
      <ul class="list-group list-group-flush">
        ${
          data.respuestas.length > 0
            ? data.respuestas.map((r) => `<li class="list-group-item">${r.respuesta || "(sin texto)"}</li>`).join("")
            : `<li class="list-group-item text-muted">Todavía no hay respuestas.</li>`
        }
      </ul>
    `;
  }
  new bootstrap.Modal(document.getElementById("modalResultadosEncuesta")).show();
}

async function cerrarEncuesta(id) {
  if (!confirm("¿Cerrar esta encuesta? Ya no se podrán enviar más respuestas.")) return;
  const { ok, data } = await apiFetch(`/encuestas/${id}/cerrar`, { method: "PUT" });
  if (ok) {
    cargarEncuestasRepresentante();
  } else {
    alert(data.mensaje || "No se pudo cerrar la encuesta");
  }
}

// ==========================================
// MI CUENTA: editar datos, cambiar contraseña, eliminar cuenta
// (disponible para ambos roles)
// ==========================================
async function prepararMiCuenta(sesion) {
  const grupoInstitucion = document.getElementById("grupoCuentaInstitucion");
  const grupoCuit = document.getElementById("grupoCuentaCuit");
  const esRepresentante = sesion.rol === "representante";

  grupoInstitucion?.classList.toggle("d-none", !esRepresentante);
  grupoCuit?.classList.toggle("d-none", !esRepresentante);

  // Precargamos con lo que ya tenemos en la sesión, y refrescamos con /auth/me
  // por si hay datos más recientes (ej. teléfono, institución).
  document.getElementById("cuentaNombre").value = sesion.nombre || "";
  document.getElementById("cuentaApellido").value = sesion.apellido || "";
  document.getElementById("cuentaEmail").value = sesion.email_login || "";
  document.getElementById("cuentaTelefono").value = sesion.telefono || "";

  const { ok, data } = await apiFetch("/auth/me");
  if (ok && data.usuario) {
    const usuario = data.usuario;
    document.getElementById("cuentaNombre").value = usuario.nombre || "";
    document.getElementById("cuentaApellido").value = usuario.apellido || "";
    document.getElementById("cuentaEmail").value = usuario.email_login || "";
    document.getElementById("cuentaTelefono").value = usuario.telefono || "";
    if (esRepresentante && usuario.institucion) {
      document.getElementById("cuentaInstitucionNombre").value = usuario.institucion.nombre || "";
      document.getElementById("cuentaInstitucionCuit").value = usuario.institucion.cuit || "";
    }
  }

  // --- Formulario: editar datos ---
  document.getElementById("formCuentaDatos").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cuerpo = {
      nombre: document.getElementById("cuentaNombre").value.trim(),
      apellido: document.getElementById("cuentaApellido").value.trim(),
      telefono: document.getElementById("cuentaTelefono").value.trim(),
      email: document.getElementById("cuentaEmail").value.trim(),
    };
    if (esRepresentante) {
      cuerpo.institucionNombre = document.getElementById("cuentaInstitucionNombre").value.trim();
      cuerpo.cuit = document.getElementById("cuentaInstitucionCuit").value.trim();
    }

    const { ok, data } = await apiFetch("/auth/me", { method: "PUT", body: cuerpo });
    const msj = document.getElementById("msjCuentaDatos");
    if (ok) {
      msj.innerHTML = `<div class="alert alert-success py-2">${data.mensaje}</div>`;
      // Actualizamos la sesión local para que se refleje en el navbar/saludo
      const sesionActual = obtenerSesion();
      guardarSesion(
        { ...sesionActual, nombre: cuerpo.nombre, apellido: cuerpo.apellido, email_login: cuerpo.email },
        localStorage.getItem("token"),
      );
      setTimeout(() => window.location.reload(), 1000);
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudieron guardar los cambios"}</div>`;
    }
  });

  // --- Formulario: cambiar contraseña ---
  document.getElementById("formCuentaPassword").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msj = document.getElementById("msjCuentaPassword");
    const nueva = document.getElementById("cuentaPasswordNueva").value;
    const confirmar = document.getElementById("cuentaPasswordConfirmar").value;

    if (nueva !== confirmar) {
      msj.innerHTML = `<div class="alert alert-danger py-2">Las contraseñas nuevas no coinciden.</div>`;
      return;
    }

    const { ok, data } = await apiFetch("/auth/me/password", {
      method: "PUT",
      body: {
        passwordActual: document.getElementById("cuentaPasswordActual").value,
        passwordNueva: nueva,
      },
    });

    if (ok) {
      msj.innerHTML = `<div class="alert alert-success py-2">${data.mensaje}</div>`;
      document.getElementById("formCuentaPassword").reset();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo cambiar la contraseña"}</div>`;
    }
  });

  // --- Formulario: eliminar cuenta ---
  document.getElementById("formCuentaEliminar").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("¿Seguro que querés eliminar tu cuenta? Vas a perder el acceso a la plataforma.")) return;

    const { ok, data } = await apiFetch("/auth/me", {
      method: "DELETE",
      body: { password: document.getElementById("cuentaPasswordEliminar").value },
    });

    const msj = document.getElementById("msjCuentaEliminar");
    if (ok) {
      alert(data.mensaje);
      cerrarSesion();
      window.location.href = "index.html";
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo eliminar la cuenta"}</div>`;
    }
  });
}
