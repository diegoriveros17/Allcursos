// src/utils/dni.service.js
//
// Hoy no existe (que hayamos encontrado) una API pública y gratuita para
// verificar si un DNI corresponde a una persona real en Argentina. Este
// archivo deja preparada la integración para el día que consigan una
// (por ejemplo, un servicio de un padrón provincial, RENAPER a través de
// un tercero, o una API paga).
//
// Cómo conectar una API real:
//   1. Completar DNI_API_URL y DNI_API_KEY en el .env
//   2. Ajustar `mapearRespuesta` según el formato que devuelva esa API
//      (cada proveedor devuelve los campos con nombres distintos)
//
// Mientras tanto, devuelve "Sin_verificar" para no bloquear ninguna
// inscripción ni registro por la ausencia del servicio.

export async function verificarDNI(dni, { nombre, apellido } = {}) {
  const { DNI_API_URL, DNI_API_KEY } = process.env;

  if (!DNI_API_URL) {
    return {
      estado: "Sin_verificar",
      mensaje: "No hay un servicio de verificación de DNI configurado todavía.",
    };
  }

  try {
    const url = new URL(DNI_API_URL);
    url.searchParams.set("dni", dni);

    const respuesta = await fetch(url, {
      headers: DNI_API_KEY ? { Authorization: `Bearer ${DNI_API_KEY}` } : {},
    });

    if (!respuesta.ok) {
      return {
        estado: "Sin_verificar",
        mensaje: "El servicio de verificación de DNI no respondió correctamente.",
      };
    }

    const datos = await respuesta.json();
    return mapearRespuesta(datos, { nombre, apellido });
  } catch (error) {
    console.error("Error al verificar el DNI:", error.message);
    return {
      estado: "Sin_verificar",
      mensaje: "No se pudo contactar al servicio de verificación de DNI.",
    };
  }
}

// Ajustar esta función según el formato real que devuelva el proveedor que
// contraten. Se deja un ejemplo genérico (existe: boolean, nombre, apellido).
function mapearRespuesta(datos, { nombre, apellido }) {
  if (!datos || datos.existe !== true) {
    return { estado: "No_verificado", mensaje: "El DNI no existe en el padrón consultado." };
  }

  const coincideNombre =
    !nombre ||
    !apellido ||
    (datos.nombre?.toUpperCase().includes(nombre.toUpperCase()) &&
      datos.apellido?.toUpperCase().includes(apellido.toUpperCase()));

  return coincideNombre
    ? { estado: "Verificado", mensaje: "El DNI existe y los datos coinciden." }
    : {
        estado: "No_verificado",
        mensaje: "El DNI existe pero el nombre/apellido no coincide con el padrón.",
      };
}
