// assets/js/verificar_certificado.js
document.addEventListener("DOMContentLoaded", () => {
  const parametros = new URLSearchParams(window.location.search);
  const codigoURL = parametros.get("codigo");
  if (codigoURL) {
    document.getElementById("codigoCertificado").value = codigoURL;
    verificarCodigo(codigoURL);
  }
});

document.getElementById("formVerificarCertificado").addEventListener("submit", async (e) => {
  e.preventDefault();
  const codigo = document.getElementById("codigoCertificado").value.trim();
  if (codigo) verificarCodigo(codigo);
});

async function verificarCodigo(codigo) {
  const contenedor = document.getElementById("resultadoVerificacion");
  contenedor.innerHTML = `<div class="text-center py-3"><div class="spinner-border" role="status" style="color: var(--brand-primary);"></div></div>`;

  const { ok, data } = await apiFetch(`/certificados/verificar/${encodeURIComponent(codigo)}`, {
    auth: false,
  });

  if (ok && data.valido) {
    const c = data.certificado;
    const fecha = new Date(c.fecha_emision).toLocaleDateString("es-AR");
    contenedor.innerHTML = `
      <div class="alert alert-success border-0 shadow-sm">
        <div class="d-flex align-items-center mb-3">
          <i class="bi bi-check-circle-fill fs-2 text-success me-2"></i>
          <h5 class="mb-0">Certificado válido</h5>
        </div>
        <p class="mb-1"><strong>Nombre:</strong> ${c.nombreCompleto}</p>
        <p class="mb-1"><strong>Curso:</strong> ${c.curso}</p>
        <p class="mb-1"><strong>Institución:</strong> ${c.institucion}</p>
        ${c.duracion_horas ? `<p class="mb-1"><strong>Duración:</strong> ${c.duracion_horas} horas</p>` : ""}
        <p class="mb-1"><strong>Fecha de emisión:</strong> ${fecha}</p>
        <p class="mb-0"><strong>Código:</strong> ${c.codigo_verificacion}</p>
      </div>
    `;
  } else {
    contenedor.innerHTML = `
      <div class="alert alert-danger border-0 shadow-sm">
        <div class="d-flex align-items-center">
          <i class="bi bi-x-circle-fill fs-2 text-danger me-2"></i>
          <h5 class="mb-0">Certificado no encontrado</h5>
        </div>
        <p class="mb-0 mt-2">${data.mensaje || "Revisá que el código esté bien escrito e intentá de nuevo."}</p>
      </div>
    `;
  }
}
