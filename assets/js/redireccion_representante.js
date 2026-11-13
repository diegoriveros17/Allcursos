// assets/js/redireccion_representante.js
// Se carga en el <head> del inicio (antes de dibujar la página) para que no se vea un "parpadeo":
// si quien entra es un representante con sesión iniciada, lo lleva directo a su panel,
// donde ve sólo los cursos de su institución. Sin sesión (o con otro rol) el inicio se ve normal.
(function () {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
    if (usuario && usuario.rol === "representante" && localStorage.getItem("token")) {
      window.location.replace("dashboard.html");
    }
  } catch (e) {
    // Si el almacenamiento está bloqueado o dañado, se muestra el inicio normal
  }
})();
