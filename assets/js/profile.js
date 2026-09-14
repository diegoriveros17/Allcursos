// Página de perfil. Los datos personales se guardan mediante la API existente.
// La foto se guarda solo en este navegador porque el backend actual no tiene
// un campo ni una ruta para almacenar avatares.
document.addEventListener("DOMContentLoaded", async () => {
  const sesion = obtenerSesion();
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  const esRepresentante = sesion.rol === "representante";
  const claveFoto = `fotoPerfil_${sesion.id || sesion.email_login}`;
  const imagen = document.getElementById("perfilFotoPreview");
  const iniciales = document.getElementById("perfilIniciales");
  const inputFoto = document.getElementById("perfilFotoInput");
  const botonQuitarFoto = document.getElementById("btnQuitarFoto");

  function actualizarFoto(foto) {
    const letras = `${sesion.nombre?.[0] || "U"}${sesion.apellido?.[0] || ""}`.toUpperCase();
    iniciales.textContent = letras;
    imagen.src = foto || "";
    imagen.classList.toggle("d-none", !foto);
    iniciales.classList.toggle("d-none", Boolean(foto));
    botonQuitarFoto.classList.toggle("d-none", !foto);
  }

  actualizarFoto(localStorage.getItem(claveFoto));
  document.getElementById("perfilNombreVisible").textContent = `${sesion.nombre || ""} ${sesion.apellido || ""}`.trim();
  document.getElementById("perfilRolVisible").textContent = esRepresentante ? "Representante institucional" : "Ciudadano";
  document.getElementById("grupoCuentaInstitucion").classList.toggle("d-none", !esRepresentante);
  document.getElementById("grupoCuentaCuit").classList.toggle("d-none", !esRepresentante);

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

  document.getElementById("btnCambiarFoto").addEventListener("click", () => inputFoto.click());
  inputFoto.addEventListener("change", () => {
    const archivo = inputFoto.files[0];
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      alert("Elegí una imagen de hasta 2 MB.");
      inputFoto.value = "";
      return;
    }
    const lector = new FileReader();
    lector.addEventListener("load", () => {
      localStorage.setItem(claveFoto, lector.result);
      actualizarFoto(lector.result);
    });
    lector.readAsDataURL(archivo);
  });
  botonQuitarFoto.addEventListener("click", () => {
    localStorage.removeItem(claveFoto);
    actualizarFoto(null);
  });

  document.getElementById("formCuentaDatos").addEventListener("submit", async (evento) => {
    evento.preventDefault();
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
    const respuesta = await apiFetch("/auth/me", { method: "PUT", body: cuerpo });
    const mensaje = document.getElementById("msjCuentaDatos");
    if (!respuesta.ok) {
      mensaje.innerHTML = `<div class="alert alert-danger py-2">${respuesta.data.mensaje || "No se pudieron guardar los cambios."}</div>`;
      return;
    }
    guardarSesion({ ...obtenerSesion(), nombre: cuerpo.nombre, apellido: cuerpo.apellido, email_login: cuerpo.email }, obtenerToken());
    mensaje.innerHTML = `<div class="alert alert-success py-2">${respuesta.data.mensaje || "Cambios guardados."}</div>`;
    setTimeout(() => window.location.reload(), 800);
  });

  document.getElementById("formCuentaPassword").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nueva = document.getElementById("cuentaPasswordNueva").value;
    const confirmar = document.getElementById("cuentaPasswordConfirmar").value;
    const mensaje = document.getElementById("msjCuentaPassword");
    if (nueva !== confirmar) {
      mensaje.innerHTML = '<div class="alert alert-danger py-2">Las contraseñas nuevas no coinciden.</div>';
      return;
    }
    const respuesta = await apiFetch("/auth/me/password", { method: "PUT", body: { passwordActual: document.getElementById("cuentaPasswordActual").value, passwordNueva: nueva } });
    mensaje.innerHTML = `<div class="alert alert-${respuesta.ok ? "success" : "danger"} py-2">${respuesta.data.mensaje || "No se pudo actualizar la contraseña."}</div>`;
    if (respuesta.ok) document.getElementById("formCuentaPassword").reset();
  });

  document.getElementById("formCuentaEliminar").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!confirm("¿Seguro que querés eliminar tu cuenta? Esta acción no se puede deshacer.")) return;
    const respuesta = await apiFetch("/auth/me", { method: "DELETE", body: { password: document.getElementById("cuentaPasswordEliminar").value } });
    if (respuesta.ok) {
      cerrarSesion();
      window.location.href = "index.html";
      return;
    }
    document.getElementById("msjCuentaEliminar").innerHTML = `<div class="alert alert-danger py-2">${respuesta.data.mensaje || "No se pudo eliminar la cuenta."}</div>`;
  });
});
