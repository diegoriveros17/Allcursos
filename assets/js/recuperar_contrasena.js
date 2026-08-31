const formSolicitarCodigo = document.getElementById("formSolicitarCodigo");
const formConfirmarCodigo = document.getElementById("formConfirmarCodigo");
let emailEnProceso = "";

formSolicitarCodigo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("emailRecuperar").value.trim();

  const { ok, data } = await apiFetch("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  });

  const msj = document.getElementById("msjSolicitarCodigo");
  if (ok) {
    emailEnProceso = email;
    msj.innerHTML = `<div class="alert alert-success py-2">${data.mensaje}</div>`;
    formSolicitarCodigo.classList.add("d-none");
    formConfirmarCodigo.classList.remove("d-none");
  } else {
    msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo procesar la solicitud"}</div>`;
  }
});

formConfirmarCodigo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const codigo = document.getElementById("codigoRecuperar").value.trim();
  const password = document.getElementById("passwordNueva").value;

  const { ok, data } = await apiFetch("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { email: emailEnProceso, codigo, password },
  });

  const msj = document.getElementById("msjConfirmarCodigo");
  if (ok) {
    msj.innerHTML = `<div class="alert alert-success py-2">${data.mensaje} Redirigiendo al login...</div>`;
    setTimeout(() => (window.location.href = "login.html"), 1800);
  } else {
    msj.innerHTML = `<div class="alert alert-danger py-2">${data.mensaje || "No se pudo cambiar la contraseña"}</div>`;
  }
});
