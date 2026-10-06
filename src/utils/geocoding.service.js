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
