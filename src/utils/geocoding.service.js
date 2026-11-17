// src/utils/geocoding.service.js
//
// Convierte una dirección de texto en coordenadas (latitud/longitud) para
// poder mostrarla en un mapa. Usa Nominatim, el geocodificador gratuito de
// OpenStreetMap: no requiere ninguna API key ni cuenta paga, sólo hay que
// respetar su política de uso (identificarse con un User-Agent y no hacer
// más de ~1 solicitud por segundo, que es más que suficiente para esto,
// ya que sólo se geocodifica cuando un representante crea/edita un curso).
//
// Si en el futuro prefieren un proveedor distinto (Google Geocoding,
// Mapbox, etc.), sólo hay que reemplazar la función `geocodificarDireccion`
// de este archivo; el resto de la app no necesita cambios.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodificarDireccion({ calle, numero, ciudad, provincia }) {
  if (!calle || !ciudad) return null;

  const direccionCompleta = [
    `${calle} ${numero || ""}`.trim(),
    ciudad,
    provincia,
    "Argentina",
  ]
    .filter(Boolean)
    .join(", ");

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", direccionCompleta);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const respuesta = await fetch(url, {
      headers: {
        // Nominatim exige identificar la aplicación que consulta
        "User-Agent": "AllCursos/1.0 (plataforma de cursos)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!respuesta.ok) return null;

    const resultados = await respuesta.json();
    if (!resultados || resultados.length === 0) return null;

    return {
      latitud: parseFloat(resultados[0].lat),
      longitud: parseFloat(resultados[0].lon),
    };
  } catch (error) {
    // Si Nominatim no responde a tiempo o falla, no bloqueamos la creación
    // del curso: simplemente queda sin coordenadas (no se muestra el mapa,
    // pero sí el resto de los datos de la dirección).
    console.error("No se pudo geocodificar la dirección:", error.message);
    return null;
  }
}

// Rectángulo que encierra la provincia de Formosa (oeste, norte, este, sur).
// Se usa para que el buscador priorice lugares de Formosa.
const VIEWBOX_FORMOSA = "-62.40,-21.95,-57.50,-27.10";

// Hace una consulta a Nominatim y devuelve la lista cruda (o [] si falla)
async function consultarNominatim(parametros) {
  const url = new URL(NOMINATIM_URL);
  Object.entries({
    format: "json",
    limit: "8",
    countrycodes: "ar",
    "accept-language": "es",
    addressdetails: "1",
    ...parametros,
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const respuesta = await fetch(url, {
      headers: { "User-Agent": "AllCursos/1.0 (plataforma de cursos)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!respuesta.ok) return [];
    return (await respuesta.json()) || [];
  } catch (error) {
    console.error("No se pudo buscar el lugar:", error.message);
    return [];
  }
}

// Arma un nombre corto y legible: "Lugar, calle número, barrio, ciudad, provincia"
function nombreLegible(r) {
  const a = r.address || {};
  const calle = [a.road, a.house_number].filter(Boolean).join(" ");
  const ciudad = a.city || a.town || a.village || a.hamlet || a.municipality || a.county;
  const partes = [r.name && r.name !== a.road ? r.name : null, calle, a.suburb || a.neighbourhood, ciudad, a.state]
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i);
  return partes.length >= 2 ? partes.join(", ") : r.display_name;
}

const esDeFormosa = (r) => (r.address?.state || "").toLowerCase().includes("formosa");

// Busca lugares por texto libre para el buscador del mapa.
// 1) Primero busca SÓLO dentro de la provincia de Formosa.
// 2) Si no hay resultados y escribió una altura (ej. "25 de Mayo 500"), busca la calle
//    sin la altura dentro de Formosa (OpenStreetMap casi no tiene numeración allí);
//    el pin queda en la calle y el representante lo arrastra al punto exacto.
// 3) Si igual no encuentra nada, busca en toda Argentina.
export async function buscarLugares(texto) {
  const consulta = String(texto || "").trim();
  if (consulta.length < 3) return [];

  const enFormosa = async (q) =>
    (await consultarNominatim({ q, viewbox: VIEWBOX_FORMOSA, bounded: "1" })).filter(esDeFormosa);

  // "Av." / "Avda." -> "Avenida" (OpenStreetMap guarda el nombre completo)
  const normalizada = consulta.replace(/\b(av|avda)\.?\s+/gi, "Avenida ");

  let resultados = await enFormosa(normalizada);
  // Saca sólo la altura final (ej. "25 de Mayo 500, Formosa" -> "25 de Mayo, Formosa")
  const sinAltura = normalizada.replace(/\s+(n[°º]\.?\s*)?\d{1,5}(?=\s*(,|$))/gi, "").trim();
  if (resultados.length === 0 && sinAltura !== normalizada && sinAltura.length >= 3) {
    resultados = await enFormosa(sinAltura);
  }
  if (resultados.length === 0) resultados = await consultarNominatim({ q: normalizada });

  const vistos = new Set();
  return resultados
    .map((r) => ({
      nombre: nombreLegible(r),
      detalle: r.display_name,
      latitud: parseFloat(r.lat),
      longitud: parseFloat(r.lon),
      en_formosa: esDeFormosa(r),
    }))
    .filter((l) => Number.isFinite(l.latitud) && Number.isFinite(l.longitud))
    .filter((l) => {
      const clave = `${l.latitud.toFixed(5)},${l.longitud.toFixed(5)}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .sort((a, b) => Number(b.en_formosa) - Number(a.en_formosa));
}
