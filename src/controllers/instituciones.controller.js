// controllers/instituciones.controller.js
import { institucionesModel } from "../models/instituciones.model.js";
import { direccionesModel } from "../models/direcciones.model.js";
import { representanteInstituModel } from "../models/representante_institucion.model.js"; // Modelo que vincula usuarios representantes con instituciones (para chequear permisos)
import { construirUrlMapa } from "../utils/mapas.js"; // Función que valida el texto y arma la URL segura del mapa
import { buscarLugares } from "../utils/geocoding.service.js"; // NUEVO: función que busca lugares por texto (buscador del mapa)

export const agregarInstituciones = async (req, res) => {
  try {
    const { nombre, cuit, direccion_id } = req.body;
    if (!nombre)
      return res
        .status(400)
        .json({ errores: ["El nombre de la institución es obligatorio"] });

    const institucion = await institucionesModel.create({
      nombre,
      cuit,
      direccion_id,
    });
    return res
      .status(201)
      .json({ mensaje: "Institución creada correctamente", institucion });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al crear institución", error: error.message });
  }
};

export const verTodasInstituciones = async (req, res) => {
  try {
    const instituciones = await institucionesModel.findAll({
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    return res
      .status(200)
      .json({ mensaje: "Todas las instituciones", instituciones });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "Error al obtener instituciones",
        error: error.message,
      });
  }
};

export const verPorIdInstituciones = async (req, res) => {
  try {
    const institucion = await institucionesModel.findByPk(req.params.id, {
      include: [{ model: direccionesModel, as: "direccion" }],
    });
    if (!institucion)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    return res
      .status(200)
      .json({ mensaje: "Institución encontrada", institucion });
  } catch (error) {
    return res
      .status(500)
      .json({
        mensaje: "Error al ver institución por id",
        error: error.message,
      });
  }
};

export const borrarInstituciones = async (req, res) => {
  try {
    const eliminados = await institucionesModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    return res.status(200).json({ mensaje: "Institución eliminada" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar institución", error: error.message });
  }
};

export const editarInstituciones = async (req, res) => {
  try {
    const [actualizados] = await institucionesModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Institución no encontrada" });
    const institucionActualizada = await institucionesModel.findByPk(
      req.params.id,
    );
    return res
      .status(200)
      .json({ mensaje: "Institución actualizada", institucionActualizada });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar institución", error: error.message });
  }
};

// NUEVO: guarda la ubicación de Google Maps de una institución (PUT /api/instituciones/:id/ubicacion)
export const guardarUbicacion = async (req, res) => { // Controlador async: recibe la petición (req) y arma la respuesta (res)
  try { // Si algo falla adentro, salta al catch
    const institucion = await institucionesModel.findByPk(req.params.id); // Busca la institución por el id que viene en la URL
    if (!institucion) return res.status(404).json({ mensaje: "Institución no encontrada" }); // Si no existe, responde 404 y corta

    if (req.usuario.rol === "representante") { // Si quien llama es representante, hay que comprobar que sea SU institución
      const vinculo = await representanteInstituModel.findOne({ // Busca en la tabla intermedia...
        where: { usuario_id: req.usuario.id, institucion_id: institucion.id }, // ...una fila de este usuario con esta institución
      }); // Cierra la búsqueda
      if (!vinculo) return res.status(403).json({ mensaje: "Sólo podés editar la ubicación de tu propia institución" }); // Si no hay vínculo, responde 403 (prohibido)
    } // Cierra el if del representante (el administrador puede editar cualquiera)

    const cambios = {}; // NUEVO: objeto donde se juntan sólo los campos que realmente llegaron en la petición

    if (req.body.ubicacion_maps !== undefined) { // Si llegó el texto de Google Maps (dirección, coordenadas o iframe)...
      const texto = String(req.body.ubicacion_maps ?? "").trim(); // ...lo toma como texto sin espacios sobrantes
      if (texto.length > 2000) return res.status(400).json({ mensaje: "La ubicación es demasiado larga" }); // Limita el tamaño para evitar abusos
      if (texto && !construirUrlMapa(texto)) { // Si escribió algo pero no se pudo convertir en un mapa válido...
        return res.status(400).json({ // ...responde 400 (datos inválidos)
          mensaje: "Ingresá una dirección, coordenadas (ej: -26.1857, -58.1756) o el código de \"Insertar un mapa\" de Google Maps", // Explica qué formatos se aceptan
        }); // Cierra el json
      } // Cierra el if de validación
      cambios.ubicacion_maps = texto || null; // Guarda el texto (o null para borrar)
    } // Cierra el if del texto

    if (req.body.latitud !== undefined || req.body.longitud !== undefined) { // NUEVO: si llegó el pin (latitud/longitud)...
      const vacio = (v) => v === null || v === undefined || String(v).trim() === ""; // Función auxiliar: true si el valor viene vacío
      if (vacio(req.body.latitud) && vacio(req.body.longitud)) { // Si ambos vienen vacíos...
        cambios.latitud = null; // ...borra la latitud
        cambios.longitud = null; // ...y la longitud (se quita el pin)
      } else { // Si viene al menos uno...
        const lat = Number(req.body.latitud); // ...convierte la latitud a número
        const lng = Number(req.body.longitud); // ...y la longitud a número
        if (vacio(req.body.latitud) || vacio(req.body.longitud) || !Number.isFinite(lat) || !Number.isFinite(lng)) { // Si falta uno o no son números válidos...
          return res.status(400).json({ mensaje: "La latitud y la longitud deben ser números" }); // ...responde 400
        } // Cierra el if de números
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { // Si están fuera del rango real de la Tierra...
          return res.status(400).json({ mensaje: "Coordenadas fuera de rango (latitud -90 a 90, longitud -180 a 180)" }); // ...responde 400
        } // Cierra el if de rango
        cambios.latitud = lat; // Guarda la latitud validada
        cambios.longitud = lng; // Guarda la longitud validada
      } // Cierra el else
    } // Cierra el if del pin

    await institucion.update(cambios); // Guarda en la base sólo lo que cambió
    const hayAlgo = !!(institucion.ubicacion_maps || institucion.latitud !== null); // Indica si la institución quedó con alguna ubicación cargada
    return res.status(200).json({ // Responde OK con lo guardado
      mensaje: hayAlgo ? "Ubicación guardada correctamente" : "Ubicación eliminada", // Mensaje según el resultado
      ubicacion_maps: institucion.ubicacion_maps, // Texto de Google Maps guardado
      mapa_embed_url: construirUrlMapa(institucion.ubicacion_maps), // URL lista para el iframe (null si no hay)
      latitud: institucion.latitud === null ? null : Number(institucion.latitud), // Latitud del pin como número (o null)
      longitud: institucion.longitud === null ? null : Number(institucion.longitud), // Longitud del pin como número (o null)
    }); // Cierra el json
  } catch (error) { // Si hubo un error inesperado...
    return res.status(500).json({ mensaje: "Error al guardar la ubicación", error: error.message }); // ...responde 500 con el detalle
  } // Cierra el catch
}; // Cierra el controlador

// NUEVO: devuelve la ubicación de una institución (GET /api/instituciones/:id/ubicacion), pública
export const verUbicacion = async (req, res) => { // Controlador async para consultar la ubicación
  try { // Intenta ejecutar el código
    const institucion = await institucionesModel.findByPk(req.params.id, { attributes: ["id", "nombre", "ubicacion_maps", "latitud", "longitud"] }); // Busca la institución trayendo sólo los campos necesarios
    if (!institucion) return res.status(404).json({ mensaje: "Institución no encontrada" }); // Si no existe responde 404
    return res.status(200).json({ // Responde OK con los datos
      institucion_id: institucion.id, // Id de la institución
      nombre: institucion.nombre, // Nombre de la institución
      ubicacion_maps: institucion.ubicacion_maps, // Texto original cargado por el representante
      mapa_embed_url: construirUrlMapa(institucion.ubicacion_maps), // URL segura para el iframe (null si no hay ubicación)
      latitud: institucion.latitud === null ? null : Number(institucion.latitud), // NUEVO: latitud del pin (número o null)
      longitud: institucion.longitud === null ? null : Number(institucion.longitud), // NUEVO: longitud del pin (número o null)
    }); // Cierra el json
  } catch (error) { // Si algo falla...
    return res.status(500).json({ mensaje: "Error al obtener la ubicación", error: error.message }); // ...responde 500
  } // Cierra el catch
}; // Cierra el controlador

// NUEVO: sugerencias de lugares para el buscador del mapa (GET /api/lugares/buscar?q=texto)
export const sugerirLugares = async (req, res) => { // Controlador async porque consulta un servicio externo
  try { // Intenta ejecutar
    const lugares = await buscarLugares(req.query.q); // Busca hasta 5 lugares con el texto recibido en la URL
    return res.status(200).json({ lugares }); // Responde con la lista (vacía si no hubo resultados)
  } catch (error) { // Si algo falla...
    return res.status(500).json({ mensaje: "Error al buscar el lugar", error: error.message }); // ...responde 500
  } // Cierra el catch
}; // Cierra el controlador
