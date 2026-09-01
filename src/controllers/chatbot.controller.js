import { responderChatbot } from "../utils/chatbot.service.js";

export const chatear = async (req, res) => {
  try {
    const { mensaje, curso_id } = req.body;
    if (!mensaje || typeof mensaje !== "string") {
      return res.status(400).json({ mensaje: "Debes enviar un mensaje" });
    }
    if (mensaje.length > 500) {
      return res.status(400).json({ mensaje: "El mensaje es demasiado largo" });
    }

    const respuesta = await responderChatbot(mensaje.trim(), curso_id || null);
    return res.status(200).json({ respuesta });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al procesar tu consulta",
      respuesta:
        "Tuve un problema para responderte. Probá de nuevo en un momento, o consultá directamente el detalle del curso.",
      error: error.message,
    });
  }
};
