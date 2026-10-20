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

// NUEVO: busca lugares por texto libre y devuelve hasta 5 sugerencias para el buscador del mapa
export async function buscarLugares(texto) { // Recibe lo que escribió el usuario (ej: "Av. 25 de Mayo 500, Formosa")
  const consulta = String(texto || "").trim(); // Convierte a texto sin espacios sobrantes
  if (consulta.length < 3) return []; // Con menos de 3 letras no busca (evita pedidos inútiles)

  const url = new URL(NOMINATIM_URL); // Arma la dirección del buscador de OpenStreetMap
  url.searchParams.set("q", consulta); // Texto a buscar
  url.searchParams.set("format", "json"); // Pide la respuesta en formato JSON
  url.searchParams.set("limit", "5"); // Máximo 5 sugerencias
  url.searchParams.set("countrycodes", "ar"); // Sólo resultados de Argentina
  url.searchParams.set("accept-language", "es"); // Nombres en español

  try { // Si algo falla, no se rompe la pantalla
    const controller = new AbortController(); // Permite cortar el pedido si tarda demasiado
    const timeout = setTimeout(() => controller.abort(), 5000); // Corta a los 5 segundos
    const respuesta = await fetch(url, { // Hace el pedido a Nominatim
      headers: { "User-Agent": "AllCursos/1.0 (plataforma de cursos)" }, // Nominatim exige identificar a la aplicación
      signal: controller.signal, // Conecta el corte por tiempo
    }); // Cierra el fetch
    clearTimeout(timeout); // Cancela el temporizador porque ya respondió
    if (!respuesta.ok) return []; // Si respondió con error, devuelve lista vacía

    const resultados = await respuesta.json(); // Convierte la respuesta a objetos JavaScript
    return (resultados || []).map((r) => ({ // Deja sólo los datos que necesita el frontend
      nombre: r.display_name, // Nombre completo del lugar
      latitud: parseFloat(r.lat), // Latitud como número
      longitud: parseFloat(r.lon), // Longitud como número
    })); // Cierra el map
  } catch (error) { // Si hubo un error de red o tiempo agotado...
    console.error("No se pudo buscar el lugar:", error.message); // ...lo muestra en la consola del servidor
    return []; // ...y devuelve lista vacía
  } // Cierra el catch
} // Cierra la función
