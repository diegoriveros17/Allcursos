// assets/js/configuracion.js
const AVATAR_POR_DEFECTO = "assets/img/avatar_default.svg";

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = obtenerSesion();
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  const grupoInstitucion = document.getElementById("grupoCuentaInstitucion");
  const grupoCuit = document.getElementById("grupoCuentaCuit");
  const esRepresentante = sesion.rol === "representante";

  grupoInstitucion?.classList.toggle("d-none", !esRepresentante);
  grupoCuit?.classList.toggle("d-none", !esRepresentante);

  const avatarPreview = document.getElementById("avatarPreview");
  avatarPreview.src = sesion.avatar_url || AVATAR_POR_DEFECTO;

  // Precargamos con lo que ya tenemos en la sesión, y refrescamos con /auth/me
  // por si hay datos más recientes (ej. teléfono, institución, foto).
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
    avatarPreview.src = usuario.avatar_url || AVATAR_POR_DEFECTO;
    if (esRepresentante && usuario.institucion) {
      document.getElementById("cuentaInstitucionNombre").value = usuario.institucion.nombre || "";
      document.getElementById("cuentaInstitucionCuit").value = usuario.institucion.cuit || "";
    }
    // Sincronizamos la sesión local con lo más reciente del servidor
    guardarSesion(usuario, localStorage.getItem("token"));
  }

  // --- Foto de perfil: se sube apenas se elige un archivo ---
  const inputAvatar = document.getElementById("inputAvatar");
  inputAvatar.addEventListener("change", async () => {
    const archivo = inputAvatar.files[0];
    if (!archivo) return;

    // Vista previa inmediata, antes de esperar la respuesta del servidor
    const lector = new FileReader();
    lector.onload = (e) => (avatarPreview.src = e.target.result);
    lector.readAsDataURL(archivo);

    const formData = new FormData();
    formData.append("avatar", archivo);
    // El endpoint también exige nombre/apellido/email; los completamos con
    // los valores actuales del formulario para no pisarlos.
    formData.append("nombre", document.getElementById("cuentaNombre").value.trim());
    formData.append("apellido", document.getElementById("cuentaApellido").value.trim());
    formData.append("email", document.getElementById("cuentaEmail").value.trim());
    formData.append("telefono", document.getElementById("cuentaTelefono").value.trim());

    const { ok, data } = await apiFetchForm("/auth/me", { method: "PUT", formData });
    if (ok) {
      mostrarToast("Foto de perfil actualizada", "exito");
      const sesionActual = obtenerSesion();
      guardarSesion(
        { ...sesionActual, avatar_url: data.usuario?.avatar_url || avatarPreview.src },
        localStorage.getItem("token"),
      );
    } else {
      mostrarToast(data.mensaje || "No se pudo actualizar la foto", "error");
      avatarPreview.src = sesion.avatar_url || AVATAR_POR_DEFECTO;
    }
  });

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
      mostrarToast("Datos actualizados correctamente", "exito");
      msj.innerHTML = "";
      const sesionActual = obtenerSesion();
      guardarSesion(
        { ...sesionActual, nombre: cuerpo.nombre, apellido: cuerpo.apellido, email_login: cuerpo.email },
        localStorage.getItem("token"),
      );
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
      mostrarToast("Contraseña actualizada correctamente", "exito");
      msj.innerHTML = "";
      document.getElementById("formCuentaPassword").reset();
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo cambiar la contraseña"}</div>`;
    }
  });

  // --- Formulario: eliminar cuenta ---
  document.getElementById("formCuentaEliminar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const confirmado = await confirmarAccion(
      "¿Seguro que querés eliminar tu cuenta? Vas a perder el acceso a la plataforma.",
      { titulo: "Eliminar cuenta", textoConfirmar: "Sí, eliminar mi cuenta" },
    );
    if (!confirmado) return;

    const { ok, data } = await apiFetch("/auth/me", {
      method: "DELETE",
      body: { password: document.getElementById("cuentaPasswordEliminar").value },
    });

    const msj = document.getElementById("msjCuentaEliminar");
    if (ok) {
      mostrarToast(data.mensaje, "info");
      cerrarSesion();
      setTimeout(() => (window.location.href = "index.html"), 1200);
    } else {
      msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo eliminar la cuenta"}</div>`;
    }
  });
});
