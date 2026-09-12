// --- 1. GUARDIÁN DE ACCESO: REDIRECCIÓN SI YA INICIÓ SESIÓN ---
if (obtenerSesion()) {
  window.location.href = "index.html";
}

// --- 2. LÓGICA DE INICIO DE SESIÓN CONECTADA A LA API ---
const formLogin = document.querySelector("#formLogin");
const msjConfirmacion = document.querySelector("#msjConfirmacion");

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = formLogin.user.value.trim();
    const password = formLogin.password.value;

    const { ok, data } = await apiFetch("/auth/login", {
      method: "POST",
      auth: false,
      body: { user, password },
    });

    if (ok) {
      guardarSesion(data.usuario, data.token);

      msjConfirmacion.innerHTML = `
        <div class="row justify-content-center p-3">
          <div class="col">
            <div class="alert alert-success" role="alert">
              ¡Hola ${data.usuario.nombre}! Redirigiendo a la página de inicio...
            </div>
          </div>
        </div>`;

      const contenedor = document.getElementById("page-container");
      if (contenedor) contenedor.classList.add("fade-out");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
    } else {
      msjConfirmacion.innerHTML = `
        <div class="row justify-content-center p-3">
          <div class="col">
            <div class="alert alert-danger" role="alert">
              ${data.mensaje || "Usuario o contraseña incorrectos"}
            </div>
          </div>
        </div>`;
    }
  });
}

// --- 3. MANEJO DINÁMICO DE SELECCIÓN DE ROL EN EL REGISTRO ---
const btnCiudadano = document.getElementById("btnRolCiudadano");
const btnRepresentante = document.getElementById("btnRolRepresentante");
const inputOcultoRol = document.getElementById("regRol");

const camposFormulario = document.getElementById("camposFormulario");
const camposCiudadano = document.getElementById("camposCiudadano");
const camposInstitucion = document.getElementById("camposInstitucion");

function seleccionarRol(rol) {
  if (!inputOcultoRol || !camposFormulario) return;

  inputOcultoRol.value = rol;
  camposFormulario.classList.remove("d-none");

  document.getElementById("nombre").required = true;
  document.getElementById("apellido").required = true;
  document.getElementById("email").required = true;
  document.getElementById("password").required = true;

  if (rol === "ciudadano") {
    btnCiudadano?.classList.replace("btn-outline-secondary", "btn-primary");
    btnCiudadano?.classList.add("text-white");
    btnRepresentante?.classList.replace("btn-primary", "btn-outline-secondary");
    btnRepresentante?.classList.remove("text-white");

    camposCiudadano?.classList.remove("d-none");
    camposInstitucion?.classList.add("d-none");

    if (document.getElementById("dni"))
      document.getElementById("dni").required = true;
    if (document.getElementById("institucionNombre"))
      document.getElementById("institucionNombre").required = false;
    if (document.getElementById("cuit"))
      document.getElementById("cuit").required = false;
  } else if (rol === "representante") {
    btnRepresentante?.classList.replace("btn-outline-secondary", "btn-primary");
    btnRepresentante?.classList.add("text-white");
    btnCiudadano?.classList.replace("btn-primary", "btn-outline-secondary");
    btnCiudadano?.classList.remove("text-white");

    camposInstitucion?.classList.remove("d-none");
    camposCiudadano?.classList.add("d-none");

    if (document.getElementById("institucionNombre"))
      document.getElementById("institucionNombre").required = true;
    if (document.getElementById("cuit"))
      document.getElementById("cuit").required = true;
    if (document.getElementById("dni"))
      document.getElementById("dni").required = false;
  }
}

if (btnCiudadano && btnRepresentante) {
  btnCiudadano.addEventListener("click", () => seleccionarRol("ciudadano"));
  btnRepresentante.addEventListener("click", () =>
    seleccionarRol("representante"),
  );
}

// --- 4. LÓGICA DE CÓDIGO DE VERIFICACIÓN DE EMAIL ---
let idVerificacionActual = null;
const btnEnviarCodigo = document.getElementById("btnEnviarCodigoEmail");
const btnConfirmarCodigo = document.getElementById("btnConfirmarCodigoEmail");
const inputEmail = document.getElementById("email");
const inputCodigo = document.getElementById("codigoVerificacion");
const seccionCodigo = document.getElementById("seccionCodigoVerificacion");
const msjEnvio = document.getElementById("msjEnvioCodigo");
const msjEstadoCodigo = document.getElementById("msjEstadoCodigo");
const inputVerificacionId = document.getElementById("verificacionId");

if (btnEnviarCodigo && inputEmail) {
  btnEnviarCodigo.addEventListener("click", async () => {
    const email = inputEmail.value.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      msjEnvio.innerHTML = `<span class="text-danger">Ingresa un correo electrónico válido antes de solicitar el código.</span>`;
      return;
    }

    btnEnviarCodigo.disabled = true;
    btnEnviarCodigo.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Enviando...`;
    msjEnvio.innerHTML = `<span class="text-muted">Enviando código de verificación...</span>`;

    const { ok, data } = await apiFetch("/verificaciones/solicitar", {
      method: "POST",
      auth: false,
      body: { medio: "Email", valor: email },
    });

    btnEnviarCodigo.disabled = false;
    btnEnviarCodigo.innerHTML = `<i class="bi bi-send me-1"></i> Reenviar Código`;

    if (ok) {
      idVerificacionActual = data.verificacion_id;
      if (inputVerificacionId) inputVerificacionId.value = "";
      seccionCodigo?.classList.remove("d-none");
      msjEnvio.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i> Te enviamos un código de 6 dígitos. Revisa tu casilla o spam.</span>`;
    } else {
      msjEnvio.innerHTML = `<span class="text-danger">${data.mensaje || "Error al solicitar el código"}</span>`;
    }
  });
}

if (btnConfirmarCodigo && inputCodigo) {
  btnConfirmarCodigo.addEventListener("click", async () => {
    const codigo = inputCodigo.value.trim();
    if (!idVerificacionActual) {
      msjEstadoCodigo.innerHTML = `<span class="text-danger">Primero solicita el código haciendo click en "Verificar Email".</span>`;
      return;
    }
    if (!codigo || codigo.length < 6) {
      msjEstadoCodigo.innerHTML = `<span class="text-danger">Ingresa el código de 6 dígitos recibido.</span>`;
      return;
    }

    btnConfirmarCodigo.disabled = true;
    btnConfirmarCodigo.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>`;

    const { ok, data } = await apiFetch("/verificaciones/confirmar", {
      method: "POST",
      auth: false,
      body: { verificacion_id: idVerificacionActual, codigo },
    });

    btnConfirmarCodigo.disabled = false;
    btnConfirmarCodigo.innerHTML = `Confirmar`;

    if (ok) {
      if (inputVerificacionId) inputVerificacionId.value = idVerificacionActual;
      inputEmail.readOnly = true;
      inputEmail.classList.add("is-valid");
      btnEnviarCodigo.disabled = true;
      btnEnviarCodigo.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Verificado`;
      seccionCodigo?.classList.add("d-none");
      msjEnvio.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-all me-1"></i> Email verificado correctamente. Ya puedes completar tu registro.</span>`;
    } else {
      msjEstadoCodigo.innerHTML = `<span class="text-danger">${data.mensaje || "Código inválido o vencido"}</span>`;
    }
  });
}

// --- 5. LÓGICA DE REGISTRO ---
const formRegistro = document.querySelector("#formRegistro");
const msjRegistro = document.querySelector("#msjRegistro");

if (formRegistro) {
  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rolElegido = inputOcultoRol ? inputOcultoRol.value : "";

    if (!rolElegido) {
      msjRegistro.innerHTML = `
        <div class="alert alert-warning mt-2">
          Por favor, selecciona si eres "Ciudadano" o "Representante de Institución" arriba.
        </div>`;
      return;
    }

    const verificacion_id = inputVerificacionId ? inputVerificacionId.value : "";
    if (!verificacion_id) {
      msjRegistro.innerHTML = `
        <div class="alert alert-warning mt-2">
          <i class="bi bi-shield-exclamation me-1"></i>
          Debes verificar tu email haciendo click en "Verificar Email" e ingresar el código de 6 dígitos antes de registrarte.
        </div>`;
      return;
    }

    const datosRegistro = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      rol: rolElegido,
      verificacion_id,
      dni: document.getElementById("dni")
        ? document.getElementById("dni").value.trim()
        : null,
      direccion: document.getElementById("address")
        ? document.getElementById("address").value.trim()
        : null,
      institucionNombre: document.getElementById("institucionNombre")
        ? document.getElementById("institucionNombre").value.trim()
        : null,
      cuit: document.getElementById("cuit")
        ? document.getElementById("cuit").value.trim()
        : null,
      cargo: document.getElementById("cargo")
        ? document.getElementById("cargo").value.trim()
        : null,
      canal_notificacion_preferido: document.getElementById("canalNotificacion")
        ? document.getElementById("canalNotificacion").value
        : "Email",
    };

    const { ok, data } = await apiFetch("/auth/register", {
      method: "POST",
      auth: false,
      body: datosRegistro,
    });

    if (ok) {
      const esRepresentante = rolElegido === "representante";
      msjRegistro.innerHTML = `
        <div class="alert alert-success mt-2">
          ${
            esRepresentante
              ? `<strong>¡Solicitud de registro enviada!</strong> Tu cuenta de representante e institución está en revisión. Un administrador la validará pronto.`
              : `<strong>¡Registro completado con éxito!</strong> Redirigiendo al inicio de sesión...`
          }
        </div>`;
      formRegistro.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, esRepresentante ? 3000 : 1800);
    } else {
      msjRegistro.innerHTML = `
        <div class="alert alert-danger mt-2">${data.mensaje || "No se pudo completar el registro"}</div>`;
    }
  });
}

