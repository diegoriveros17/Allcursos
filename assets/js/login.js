//const doc = require("pdfkit");

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

// --- 4. LÓGICA DE REGISTRO ---
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

    const datosRegistro = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      rol: rolElegido,
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
      msjRegistro.innerHTML = `
        <div class="alert alert-success mt-2">
          ¡Registro completado con éxito! Redirigiendo al inicio de sesión...
        </div>`;
      formRegistro.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);
    } else {
      msjRegistro.innerHTML = `
        <div class="alert alert-danger mt-2">${data.mensaje || "No se pudo completar el registro"}</div>`;
    }
  });
}
const passwordInput = document.getElementById("password")
const togglePassword = document.getElementById("togglePassword")
const iconEye = document.getElementById("iconEye")
if (togglePassword && passwordInput && iconEye) {
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text": "password";
    passwordInput.setAttribute("type",type)
    if (type === 'password') {
      iconEye.classList.remove('bi-eye-slash');
      iconEye.classList.add('bi-eye');
    } else {
      iconEye.classList.remove('bi-eye');
      iconEye.classList.add('bi-eye-slash');
    }
  })
}
