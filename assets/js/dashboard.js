document.addEventListener("DOMContentLoaded", () => {
  const sesion = obtenerSesion();

  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  const userNombreSpan = document.getElementById("userNombre");
  const userRolSpan = document.getElementById("userRol");
  const panelCiudadano = document.getElementById("dashCiudadano");
  const panelRepresentante = document.getElementById("dashRepresentante");
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");

  const tituloPanel = document.getElementById("saludoUsuario");
  const bajadaPanel = document.querySelector(".container.my-5.pt-5 p.text-muted");
  const infoPerfilCiudadano = document.getElementById("infoPerfilCiudadano");

  if (userNombreSpan) {
    userNombreSpan.textContent = `${sesion.nombre || ""} ${sesion.apellido || ""}`.trim();
  }
  if (userRolSpan) userRolSpan.textContent = (sesion.rol || "").toUpperCase();

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
  } else if (sesion.rol === "representante") {
    if (tituloPanel) tituloPanel.textContent = "Panel Institucional / Representante";
    if (bajadaPanel)
      bajadaPanel.textContent =
        "Bienvenido/a. Desde aquí puedes administrar la oferta de cursos de tu institución.";

    panelRepresentante?.classList.remove("d-none");
    panelCiudadano?.classList.add("d-none");
    cargarTablaRepresentante();
    prepararFormularioNuevoCurso();
  } else {
    if (tituloPanel) tituloPanel.textContent = "Mi Panel de Control";
    panelCiudadano?.classList.remove("d-none");
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => {
      cerrarSesion();
      window.location.href = "login.html";
    });
  }
});

// ==========================================
// CIUDADANO: mis cursos + certificados
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
    return;
  }

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
      <td>${curso.titulo}</td>
      <td>${curso.cupo_maximo}</td>
      <td>${curso.inscriptos || 0}</td>
      <td>
        <a class="btn btn-sm btn-outline-primary" href="alumnos_x_curso.html?id=${curso.id}">
          <i class="bi bi-people-fill"></i> Ver Alumnos
        </a>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarCurso(${curso.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
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

async function prepararFormularioNuevoCurso() {
  const select = document.getElementById("cursoCategoria");
  if (select) {
    const { ok, data } = await apiFetch("/categorias", { auth: false });
    if (ok) {
      (data.categorias || []).forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nombre;
        select.appendChild(option);
      });
    }
  }

  const form = document.getElementById("formNuevoCurso");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cuerpo = {
      titulo: document.getElementById("cursoTitulo").value.trim(),
      descripcion: document.getElementById("cursoDescripcion").value.trim(),
      categoria_id: document.getElementById("cursoCategoria").value,
      modalidad: document.getElementById("cursoModalidad").value,
      cupo_maximo: document.getElementById("cursoCupoMaximo").value,
      duracion_horas: document.getElementById("cursoDuracionHoras").value || null,
    };

    const { ok, data } = await apiFetch("/cursos", { method: "POST", body: cuerpo });
    const msj = document.getElementById("msjNuevoCurso");

    if (ok) {
      form.reset();
      const modalEl = document.getElementById("modalNuevoCurso");
      bootstrap.Modal.getInstance(modalEl)?.hide();
      cargarTablaRepresentante();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${
        data.mensaje || (data.errores ? data.errores.join(", ") : "No se pudo crear el curso")
      }</div>`;
    }
  });
}
