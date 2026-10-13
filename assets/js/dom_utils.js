// assets/js/dom_utils.js
// Utilidades chiquitas para armar HTML sin riesgo de XSS: los textos se insertan
// como nodos de texto (nunca como HTML), así que si un usuario escribe "<script>"
// se muestra literal en pantalla en vez de ejecutarse.

/**
 * h("div", { class: "card", onClick: fn }, "texto", h("span", {}, "hijo"))
 * - props: class, dataset, onXxx (eventos), value/checked (propiedades) o atributos normales.
 * - hijos: strings, nodos, arrays (anidados) — null/false se ignoran.
 */
function h(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === "class") nodo.className = valor;
    else if (clave === "dataset") Object.assign(nodo.dataset, valor);
    else if (clave === "value") nodo.value = valor;
    else if (clave === "checked") nodo.checked = !!valor;
    else if (clave.startsWith("on") && typeof valor === "function")
      nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    else nodo.setAttribute(clave, valor === true ? "" : valor);
  }
  hijos.flat(Infinity).forEach((hijo) => {
    if (hijo === null || hijo === undefined || hijo === false) return;
    nodo.append(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
  });
  return nodo;
}

function escaparHtml(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return isNaN(d) ? "" : d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function tiempoRelativo(fecha) {
  const d = new Date(fecha);
  if (isNaN(d)) return "";
  const seg = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (seg < 60) return "hace un instante";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return d.toLocaleDateString("es-AR");
}
