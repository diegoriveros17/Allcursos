// src/utils/mapas.js
// Convierte lo que escribe el representante en una URL segura para poner en un <iframe> de Google Maps.

// Función que recibe el texto cargado y devuelve la URL para el iframe (o null si el texto no sirve)
export const construirUrlMapa = (entrada) => {
  if (!entrada) return null; // Si no hay nada cargado, no hay mapa que mostrar
  let texto = String(entrada).trim(); // Convierte a texto y saca espacios al principio y al final
  const iframe = texto.match(/src=["']([^"']+)["']/i); // Busca src="..." por si el usuario pegó el <iframe> completo que da Google
  if (iframe) texto = iframe[1].replace(/&amp;/g, "&").trim(); // Si lo encontró, se queda sólo con la URL y convierte &amp; en &
  if (iframe && !texto.startsWith("https://www.google.com/maps/embed")) return null; // Si pegó un iframe cuyo src no es el oficial de Google Maps (ej. javascript:...), se rechaza
  if (texto.startsWith("https://www.google.com/maps/embed")) return texto; // Si ya es una URL oficial de "Insertar un mapa", se usa tal cual
  if (/^https?:\/\//i.test(texto)) return null; // Cualquier otra URL (ej. links cortos) no se puede incrustar, así que se rechaza
  if (texto.length > 300) return null; // Una dirección o coordenadas nunca son tan largas: se rechaza
  return `https://www.google.com/maps?q=${encodeURIComponent(texto)}&output=embed`; // Para direcciones o coordenadas arma la URL de mapa incrustable (encodeURIComponent cuida los espacios y símbolos)
}; // Cierra la función
