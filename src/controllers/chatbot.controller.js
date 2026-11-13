import { responderChatbot } from "../utils/chatbot.service.js";

// Se aceptan como máximo los últimos 8 mensajes de la conversación, para que el
// asistente entienda preguntas como "¿y los requisitos?" sin mandar chats enormes.
const MAX_HISTORIAL = 8;

function limpiarHistorial(historial) {
  if (!Array.isArray(historial)) return [];
  return historial
    .filter((t) => t && (t.rol === "usuario" || t.rol === "bot") && typeof t.texto === "string" && t.texto.trim())
    .slice(-MAX_HISTORIAL)
    .map((t) => ({ rol: t.rol, texto: t.texto.trim().slice(0, 1000) }));
}

export const chatear = async (req, res) => {
  try {
    const { mensaje, curso_id, historial } = req.body;
    if (!mensaje || typeof mensaje !== "string") {
      return res.status(400).json({ mensaje: "Debes enviar un mensaje" });
    }
    if (mensaje.length > 500) {
      return res.status(400).json({ mensaje: "El mensaje es demasiado largo" });
    }

    const idCurso = Number.isInteger(Number(curso_id)) && Number(curso_id) > 0 ? Number(curso_id) : null;
    // Devuelve { respuesta, cursos, accion? }: el texto, las tarjetas de los cursos
    // mencionados y, si corresponde, una acción que el usuario debe confirmar.
    const resultado = await responderChatbot(mensaje.trim(), idCurso, limpiarHistorial(historial), req.usuario || null);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error del chatbot:", error.message);
    return res.status(500).json({
      mensaje: "Error al procesar tu consulta",
      respuesta:
        "Tuve un problema para responderte. Probá de nuevo en un momento, o consultá directamente el detalle del curso.",
    });
  }
};
