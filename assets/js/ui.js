// assets/js/ui.js
// Efectos visuales comunes a todas las páginas: aparición de elementos al hacer scroll,
// sombra en la navbar al bajar, botón flotante para volver arriba y mejoras en los campos
// de contraseña (mostrar/ocultar, aviso de mayúsculas, medidor de seguridad). Los estilos están en style.css.

// Agrega a un campo de contraseña el botón del "ojo" para ver lo que se está escribiendo
function prepararCampoPassword(input) {
  if (input.dataset.passwordListo) return; // Ya se preparó (evita botones duplicados)
  input.dataset.passwordListo = "1";

  const boton = document.createElement("button");
  boton.type = "button"; // type="button": no envía el formulario
  boton.className = "btn-ver-password";
  boton.setAttribute("aria-label", "Mostrar contraseña");
  boton.setAttribute("aria-pressed", "false");
  boton.title = "Mostrar contraseña";
  boton.innerHTML = '<i class="bi bi-eye"></i>';

  const padre = input.parentElement;
  if (padre.classList.contains("input-group")) {
    input.after(boton); // Dentro de un input-group queda como un botón más del grupo
    boton.classList.add("en-grupo");
  } else if (padre.classList.contains("form-floating")) {
    padre.classList.add("campo-password"); // Con etiqueta flotante, el botón va encima del campo
    padre.appendChild(boton);
  } else {
    const grupo = document.createElement("div"); // Campo suelto: se envuelve en un input-group
    grupo.className = "input-group";
    input.before(grupo);
    grupo.append(input, boton);
    boton.classList.add("en-grupo");
  }

  boton.addEventListener("click", () => {
    const mostrar = input.type === "password";
    const posicion = input.selectionStart; // Se guarda dónde estaba el cursor para no perderlo
    input.type = mostrar ? "text" : "password";
    boton.innerHTML = `<i class="bi ${mostrar ? "bi-eye-slash" : "bi-eye"}"></i>`;
    boton.setAttribute("aria-pressed", String(mostrar));
    boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
    boton.title = mostrar ? "Ocultar contraseña" : "Mostrar contraseña";
    input.focus();
    if (posicion !== null) input.setSelectionRange(posicion, posicion);
  });

  // Aviso "Bloq Mayús activado" mientras se escribe
  const contenedor = input.closest(".input-group, .form-floating");
  const aviso = document.createElement("div");
  aviso.className = "aviso-mayusculas d-none";
  aviso.innerHTML = '<i class="bi bi-capslock-fill me-1"></i>Bloq Mayús está activado';
  contenedor.after(aviso);
  const revisarMayusculas = (e) => {
    if (typeof e.getModifierState === "function") aviso.classList.toggle("d-none", !e.getModifierState("CapsLock"));
  };
  input.addEventListener("keydown", revisarMayusculas);
  input.addEventListener("keyup", revisarMayusculas);
  input.addEventListener("blur", () => aviso.classList.add("d-none"));

  if (input.hasAttribute("data-fuerza")) agregarMedidorFuerza(input, aviso);
}

// Barra que indica qué tan segura es la contraseña (sólo en los campos con data-fuerza)
function agregarMedidorFuerza(input, despuesDe) {
  const medidor = document.createElement("div");
  medidor.className = "medidor-fuerza";
  medidor.innerHTML = `
    <div class="medidor-barras"><span></span><span></span><span></span><span></span></div>
    <div class="medidor-texto">Usá al menos 8 caracteres, con mayúsculas, números y símbolos.</div>`;
  despuesDe.after(medidor);

  const NIVELES = ["", "Débil", "Regular", "Buena", "Muy segura"];
  input.addEventListener("input", () => {
    const v = input.value;
    let puntos = 0;
    if (v.length >= 8) puntos++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos++;
    if (/\d/.test(v)) puntos++;
    if (/[^A-Za-z0-9]/.test(v)) puntos++;
    if (v.length > 0 && puntos === 0) puntos = 1; // Algo escrito siempre cuenta como "débil"
    medidor.dataset.nivel = v ? puntos : 0;
    medidor.querySelector(".medidor-texto").textContent = v
      ? `Seguridad: ${NIVELES[puntos]}${v.length < 8 ? " · faltan " + (8 - v.length) + " caracteres" : ""}`
      : "Usá al menos 8 caracteres, con mayúsculas, números y símbolos.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respeta si el usuario pidió menos animaciones en su sistema

  // ---------- Navbar con sombra al hacer scroll ----------
  const navbar = document.querySelector(".navbar.fixed-top"); // La barra superior fija
  const botonArriba = document.createElement("button"); // Botón flotante "volver arriba"
  botonArriba.type = "button";
  botonArriba.className = "btn-volver-arriba";
  botonArriba.title = "Volver arriba";
  botonArriba.setAttribute("aria-label", "Volver arriba");
  botonArriba.innerHTML = '<i class="bi bi-arrow-up"></i>';
  botonArriba.addEventListener("click", () => window.scrollTo({ top: 0, behavior: menosMovimiento ? "auto" : "smooth" })); // Sube suavemente
  document.body.appendChild(botonArriba);

  const alHacerScroll = () => {
    const y = window.scrollY; // Cuántos píxeles bajó el usuario
    if (navbar) navbar.classList.toggle("navbar-scrolled", y > 10); // Sombra apenas se despega del borde
    botonArriba.classList.toggle("visible", y > 400); // El botón aparece recién al bajar bastante
  };
  window.addEventListener("scroll", alHacerScroll, { passive: true }); // passive: no frena el scroll
  alHacerScroll(); // Estado inicial (por si la página se abrió ya scrolleada)

  // ---------- Contraseñas: botón "ojo", aviso de mayúsculas y medidor de seguridad ----------
  document.querySelectorAll('input[type="password"]').forEach(prepararCampoPassword);
  new MutationObserver((cambios) => {
    cambios.forEach((cambio) => cambio.addedNodes.forEach((nodo) => {
      if (nodo.nodeType !== 1) return;
      if (nodo.matches('input[type="password"]')) prepararCampoPassword(nodo);
      nodo.querySelectorAll('input[type="password"]').forEach(prepararCampoPassword); // Ej: modales armados con JavaScript
    }));
  }).observe(document.body, { childList: true, subtree: true });

  // ---------- Aparición al hacer scroll ----------
  if (menosMovimiento || !("IntersectionObserver" in window)) return; // Sin animaciones si no corresponde o el navegador no lo soporta

  const SELECTOR = "#cardCursos > *, main .card, .stats-box"; // Qué elementos aparecen con animación

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return; // Todavía no está en pantalla
      const el = entrada.target;
      el.classList.add("visible"); // Dispara la transición definida en .revelar.visible
      observador.unobserve(el); // Sólo se anima una vez
      // Al terminar, se quitan las clases para que no interfieran con el hover de las tarjetas
      setTimeout(() => {
        el.classList.remove("revelar", "visible");
        el.style.transitionDelay = "";
      }, 900);
    });
  }, { threshold: 0.1 });

  const prepararElemento = (el, indice) => {
    if (el.dataset.revelado || el.closest(".modal, .dropdown-menu, .offcanvas")) return; // Ya preparado o dentro de una ventana emergente
    if (el.parentElement && el.parentElement.closest("[data-revelado]")) return; // Su contenedor ya se anima (evita animar dos veces)
    el.dataset.revelado = "1";
    el.classList.add("revelar");
    el.style.transitionDelay = `${Math.min(indice, 5) * 60}ms`; // Efecto "cascada": cada tarjeta entra un poquito después
    observador.observe(el);
  };

  document.querySelectorAll(SELECTOR).forEach(prepararElemento); // Elementos que ya están en el HTML

  // Las tarjetas de cursos se dibujan con JavaScript después de cargar: se detectan cuando aparecen
  new MutationObserver((cambios) => {
    let indice = 0;
    cambios.forEach((cambio) => {
      cambio.addedNodes.forEach((nodo) => {
        if (nodo.nodeType !== 1) return; // Sólo elementos HTML (no texto)
        if (nodo.matches(SELECTOR)) prepararElemento(nodo, indice++);
        nodo.querySelectorAll(SELECTOR).forEach((el) => prepararElemento(el, indice++));
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
});
