// assets/js/mapa.js
// Funciones compartidas para mostrar mapas: iframe de Google Maps y mapa con pin (Leaflet + OpenStreetMap).

const mapasLeaflet = {}; // Guarda los mapas Leaflet creados, por id de contenedor: { mapa, marcador }
const CENTRO_POR_DEFECTO = [-26.1775, -58.1781]; // Coordenadas de Formosa capital, para centrar el mapa si todavía no hay pin
const URL_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // Servidor de las "baldosas" (imágenes) del mapa de OpenStreetMap
const ATRIBUCION = "&copy; Colaboradores de OpenStreetMap"; // Texto de créditos que exige OpenStreetMap

// ---------- Google Maps (iframe) ----------

// Recibe el id del contenedor (un <div>) y la URL del mapa que armó el backend
function mostrarMapa(idContenedor, urlMapa) {
  const contenedor = document.getElementById(idContenedor); // Busca el <div> donde se va a dibujar el mapa
  if (!contenedor) return; // Si el contenedor no existe en esta página, no hace nada
  contenedor.innerHTML = ""; // Vacía el contenedor por si ya había un mapa anterior
  if (!urlMapa) { // Si no hay URL (la institución no cargó ubicación)...
    contenedor.textContent = "Todavía no hay una ubicación cargada."; // ...muestra este aviso
    return; // ...y termina
  } // Cierra el if
  const iframe = document.createElement("iframe"); // Crea un <iframe>, que es una "ventanita" que muestra otra página (Google Maps)
  iframe.src = urlMapa; // Le asigna la URL del mapa (viene validada desde el backend)
  iframe.title = "Ubicación en Google Maps"; // Texto descriptivo para accesibilidad (lectores de pantalla)
  iframe.width = "100%"; // El mapa ocupa todo el ancho disponible
  iframe.height = "320"; // Alto del mapa en píxeles
  iframe.style.border = "0"; // Quita el borde feo por defecto del iframe
  iframe.loading = "lazy"; // Carga el mapa recién cuando el usuario llega a esa parte de la página
  iframe.referrerPolicy = "no-referrer-when-downgrade"; // Política de referer recomendada por Google para mapas incrustados
  iframe.allowFullscreen = true; // Permite ver el mapa en pantalla completa
  contenedor.appendChild(iframe); // Agrega el iframe dentro del contenedor
} // Cierra la función

// ---------- Leaflet (mapa con pin) ----------

// Crea (o recrea) un mapa Leaflet dentro del contenedor y devuelve el objeto mapa
function crearMapaLeaflet(idContenedor, centro, zoom) {
  const contenedor = document.getElementById(idContenedor); // Busca el <div> del mapa
  if (!contenedor) return null; // Si no existe, no hace nada
  if (typeof L === "undefined") { // Si la librería Leaflet no se cargó (ej: sin internet)...
    contenedor.textContent = "No se pudo cargar el mapa. Revisá tu conexión."; // ...muestra un aviso
    return null; // ...y termina
  } // Cierra el if
  if (mapasLeaflet[idContenedor]) mapasLeaflet[idContenedor].mapa.remove(); // Si ya había un mapa en este contenedor, lo destruye para crear uno limpio
  contenedor.innerHTML = ""; // Vacía el contenedor (por si tenía un aviso de texto)
  contenedor.style.height = "320px"; // Leaflet necesita que el contenedor tenga una altura fija
  contenedor.style.borderRadius = "8px"; // Bordes redondeados para que quede prolijo
  const mapa = L.map(contenedor).setView(centro, zoom); // Crea el mapa centrado en las coordenadas y con el zoom indicado
  L.tileLayer(URL_TILES, { maxZoom: 19, attribution: ATRIBUCION, referrerPolicy: "strict-origin-when-cross-origin" }).addTo(mapa); // Agrega la capa con las imágenes del mapa; referrerPolicy hace que cada pedido diga de qué sitio viene (OpenStreetMap lo exige)
  mapasLeaflet[idContenedor] = { mapa, marcador: null }; // Registra el mapa (todavía sin pin)
  return mapa; // Devuelve el mapa creado
} // Cierra la función

// Muestra un mapa de sólo lectura con un pin en (lat, lng); lo usa el estudiante en el detalle del curso
function mostrarMapaPin(idContenedor, lat, lng, titulo) {
  const mapa = crearMapaLeaflet(idContenedor, [lat, lng], 16); // Crea el mapa centrado en el pin con zoom de calle
  if (!mapa) return; // Si no se pudo crear, termina
  const marcador = L.marker([lat, lng]).addTo(mapa); // Coloca el pin en las coordenadas
  if (titulo) marcador.bindPopup(document.createTextNode(titulo)); // Si hay título, lo muestra al tocar el pin (como nodo de texto: evita inyectar HTML)
  mapasLeaflet[idContenedor].marcador = marcador; // Registra el pin
} // Cierra la función

// Crea un mapa donde el representante hace clic para marcar el punto exacto
// alCambiar(lat, lng) se llama cada vez que cambia el pin (lat = null si se quitó)
function iniciarSelectorPin(idContenedor, lat, lng, alCambiar) {
  const hayPin = lat !== null && lat !== undefined && lng !== null && lng !== undefined; // Indica si ya hay un pin guardado
  const mapa = crearMapaLeaflet(idContenedor, hayPin ? [lat, lng] : CENTRO_POR_DEFECTO, hayPin ? 16 : 13); // Crea el mapa (zoom de calle si hay pin, de ciudad si no)
  if (!mapa) return; // Si no se pudo crear, termina
  const registro = mapasLeaflet[idContenedor]; // Toma el registro de este mapa

  const ponerPin = (la, lo) => { // Función interna: coloca o mueve el pin
    if (registro.marcador) { // Si ya había un pin...
      registro.marcador.setLatLng([la, lo]); // ...lo mueve a la nueva posición
    } else { // Si todavía no había pin...
      registro.marcador = L.marker([la, lo], { draggable: true }).addTo(mapa); // ...lo crea, y se puede arrastrar
      registro.marcador.on("dragend", () => { // Cuando termina de arrastrarlo...
        const p = registro.marcador.getLatLng(); // ...lee la nueva posición
        if (alCambiar) alCambiar(p.lat, p.lng); // ...avisa a quien lo usa
      }); // Cierra el listener de arrastre
    } // Cierra el if/else
    if (alCambiar) alCambiar(la, lo); // Avisa la nueva posición
  }; // Cierra la función interna

  if (hayPin) ponerPin(lat, lng); // Si había un pin guardado, lo dibuja
  mapa.on("click", (e) => ponerPin(e.latlng.lat, e.latlng.lng)); // Al hacer clic en el mapa, coloca el pin ahí
  registro.alCambiar = alCambiar; // Guarda el callback para poder avisar al quitar el pin
  registro.ponerPin = ponerPin; // NUEVO: guarda la función para poder mover el pin desde el buscador de lugares
} // Cierra la función

// Devuelve { latitud, longitud } del pin actual del selector, o null si no hay pin
function obtenerPin(idContenedor) {
  const registro = mapasLeaflet[idContenedor]; // Busca el mapa registrado
  if (!registro || !registro.marcador) return null; // Si no hay mapa o pin, devuelve null
  const p = registro.marcador.getLatLng(); // Lee la posición del pin
  return { latitud: Number(p.lat.toFixed(7)), longitud: Number(p.lng.toFixed(7)) }; // Devuelve las coordenadas con 7 decimales (precisión de ~1 cm)
} // Cierra la función

// Quita el pin del selector
function quitarPin(idContenedor) {
  const registro = mapasLeaflet[idContenedor]; // Busca el mapa registrado
  if (!registro || !registro.marcador) return; // Si no hay pin, no hace nada
  registro.marcador.remove(); // Saca el pin del mapa
  registro.marcador = null; // Borra la referencia
  if (registro.alCambiar) registro.alCambiar(null, null); // Avisa que ya no hay pin
} // Cierra la función

// Redibuja el mapa; hay que llamarla cuando el mapa estaba oculto (pestaña o modal) y se vuelve visible
function refrescarMapaLeaflet(idContenedor) {
  const registro = mapasLeaflet[idContenedor]; // Busca el mapa registrado
  if (registro) registro.mapa.invalidateSize(); // Le dice a Leaflet que recalcule su tamaño
} // Cierra la función

// Arma el texto "Lat: x, Lng: y" para mostrar debajo del selector
function textoCoordenadas(lat, lng) {
  if (lat === null || lat === undefined) return "Todavía no marcaste ningún punto. Hacé clic en el mapa."; // Mensaje cuando no hay pin
  return `Punto marcado: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)} (podés arrastrar el pin para ajustarlo)`; // Muestra las coordenadas con 6 decimales
} // Cierra la función

// NUEVO: mueve el pin a unas coordenadas y centra el mapa ahí (lo usa el buscador de lugares)
function moverPin(idContenedor, lat, lng) {
  const registro = mapasLeaflet[idContenedor]; // Busca el mapa registrado
  if (!registro || !registro.ponerPin) return; // Si no existe o no es un selector, no hace nada
  registro.ponerPin(lat, lng); // Coloca (o mueve) el pin en las coordenadas
  registro.mapa.setView([lat, lng], 17); // Centra el mapa en el pin con zoom de calle
} // Cierra la función
