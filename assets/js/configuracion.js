// assets/js/configuracion.js
const AVATAR_POR_DEFECTO = "assets/img/avatar_default.svg";

// (v2.3) LIMPIEZA: se quitó la sección de ubicación de Mi Cuenta; la ubicación ahora se carga sólo al publicar/editar un curso

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

  // --- MODIFICADO (v2.3): Formulario: eliminar cuenta (motivo por radio + detalle sólo si elige "Otro") ---
  const radiosMotivo = document.querySelectorAll('input[name="motivoBaja"]'); // Busca todos los radio buttons de motivo
  const grupoMotivoOtro = document.getElementById("grupoMotivoOtro"); // Contenedor del campo de texto para "Otro motivo"
  radiosMotivo.forEach((radio) => { // Recorre cada radio button...
    radio.addEventListener("change", () => { // ...y cuando el usuario elige uno...
      const esOtro = radio.value === "otro" && radio.checked; // ...calcula si eligió "Otro motivo"
      grupoMotivoOtro.classList.toggle("d-none", !esOtro); // ...muestra el campo de texto sólo si eligió "Otro" (si no, lo oculta)
      if (esOtro) document.getElementById("motivoOtroTexto").focus(); // ...y si eligió "Otro", pone el cursor en el campo
    }); // Cierra el listener del radio
  }); // Cierra el forEach

  document.getElementById("formCuentaEliminar").addEventListener("submit", async (e) => { // Cuando se envía el formulario de baja...
    e.preventDefault(); // ...evita que la página se recargue
    const msj = document.getElementById("msjCuentaEliminar"); // Contenedor de mensajes de error
    msj.className = ""; // Limpia el estilo del mensaje anterior
    msj.textContent = ""; // Limpia el texto del mensaje anterior

    const motivoElegido = document.querySelector('input[name="motivoBaja"]:checked'); // Busca el radio button que está marcado
    const motivoOtro = document.getElementById("motivoOtroTexto").value.trim(); // Lee el detalle de "Otro motivo" sin espacios sobrantes
    if (!motivoElegido) { // Si no eligió ningún motivo...
      msj.textContent = "Elegí el motivo por el cual querés eliminar tu cuenta"; // ...pone el mensaje de error
      msj.className = "alert alert-danger py-2"; // ...con estilo de alerta roja
      return; // ...y corta sin enviar nada
    } // Cierra el if del motivo
    if (motivoElegido.value === "otro" && motivoOtro.length < 3) { // Si eligió "otro" y no escribió cuál fue...
      msj.textContent = "Escribí cuál fue el motivo"; // ...pone el mensaje de error
      msj.className = "alert alert-danger py-2"; // ...con estilo de alerta roja
      return; // ...y corta sin enviar nada
    } // Cierra el if de "otro"

    const confirmado = await confirmarAccion( // Muestra el modal de confirmación final (función que ya existe en api.js)
      "¿Seguro que querés eliminar tu cuenta? Vas a perder el acceso a la plataforma.", // Mensaje del modal
      { titulo: "Eliminar cuenta", textoConfirmar: "Sí, eliminar mi cuenta" }, // Título y texto del botón de confirmar
    ); // Cierra la llamada
    if (!confirmado) return; // Si el usuario cancela, no hace nada más

    const { ok, data } = await apiFetch("/auth/me", { // Llama al backend con DELETE
      method: "DELETE", // Método DELETE (eliminar)
      body: { // Datos que se envían
        password: document.getElementById("cuentaPasswordEliminar").value, // Contraseña para confirmar identidad
        motivo: motivoElegido.value, // Motivo elegido en los radio buttons
        motivo_otro: motivoElegido.value === "otro" ? motivoOtro : null, // Detalle del motivo (sólo se envía si eligió "Otro")
      }, // Cierra el body
    }); // Cierra la llamada

    if (ok) { // Si el backend aceptó la baja...
      mostrarToast(data.mensaje, "info"); // ...muestra el mensaje de confirmación
      cerrarSesion(); // ...borra la sesión guardada en el navegador
      setTimeout(() => (window.location.href = "index.html"), 1200); // ...y a los 1,2 segundos vuelve al inicio
    } else { // Si hubo un error (contraseña incorrecta, etc.)...
      msj.textContent = data.mensaje || "No se pudo eliminar la cuenta"; // ...muestra el motivo (textContent evita inyectar HTML)
      msj.className = "alert alert-danger py-2"; // ...con estilo de alerta roja
    } // Cierra el if/else
  }); // Cierra el listener de eliminar cuenta
});
