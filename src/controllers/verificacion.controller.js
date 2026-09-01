import crypto from "crypto";
import { Op } from "sequelize";
import { codigosVerificacionModel } from "../models/codigo_verificacion.model.js";
import { enviarEmail, enviarSMS } from "../utils/email.service.js";

const generarCodigo = () => crypto.randomInt(100000, 999999).toString();

// Paso 1: el usuario pide un código a su email o a su teléfono, antes de
// confirmar una inscripción. No requiere estar logueado (login opcional).
export const solicitarCodigo = async (req, res) => {
  try {
    const { medio, valor } = req.body;
    if (!["Email", "Telefono"].includes(medio) || !valor) {
      return res
        .status(400)
        .json({ mensaje: "Debes indicar un medio ('Email' o 'Telefono') y un valor" });
    }

    if (medio === "Email" && !/^\S+@\S+\.\S+$/.test(valor)) {
      return res.status(400).json({ mensaje: "El email no tiene un formato válido" });
    }
    if (medio === "Telefono" && !/^\+?\d{6,20}$/.test(valor.replace(/\s|-/g, ""))) {
      return res.status(400).json({ mensaje: "El teléfono no tiene un formato válido" });
    }

    const codigo = generarCodigo();
    const fecha_expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    const registro = await codigosVerificacionModel.create({
      medio,
      valor,
      codigo,
      fecha_expiracion,
    });

    if (medio === "Email") {
      await enviarEmail({
        to: valor,
        subject: "Código de verificación - AllCursos",
        html: `
          <p>Para confirmar tu inscripción, ingresá este código en la plataforma:</p>
          <h2 style="letter-spacing:4px;">${codigo}</h2>
          <p>Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>
        `,
      });
    } else {
      await enviarSMS({
        to: valor,
        mensaje: `Tu código de verificación de AllCursos es: ${codigo}. Vence en 10 minutos.`,
      });
    }

    return res.status(201).json({
      mensaje: `Te enviamos un código de verificación por ${medio === "Email" ? "email" : "SMS"}.`,
      verificacion_id: registro.id,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al solicitar el código", error: error.message });
  }
};

// Paso 2: confirma el código. Si es correcto, marca el registro como
// verificado (será chequeado nuevamente al crear la inscripción).
export const confirmarCodigo = async (req, res) => {
  try {
    const { verificacion_id, codigo } = req.body;
    if (!verificacion_id || !codigo)
      return res.status(400).json({ mensaje: "Faltan datos para confirmar el código" });

    const registro = await codigosVerificacionModel.findByPk(verificacion_id);
    if (!registro)
      return res.status(404).json({ mensaje: "No se encontró la solicitud de verificación" });

    if (registro.verificado) {
      return res.status(200).json({ mensaje: "Este contacto ya estaba verificado" });
    }

    if (registro.intentos >= 5) {
      return res
        .status(429)
        .json({ mensaje: "Superaste el máximo de intentos. Solicitá un código nuevo." });
    }

    if (registro.fecha_expiracion < new Date()) {
      return res.status(400).json({ mensaje: "El código venció, solicitá uno nuevo" });
    }

    if (registro.codigo !== codigo) {
      await registro.increment("intentos");
      return res.status(400).json({ mensaje: "Código incorrecto" });
    }

    await registro.update({ verificado: true });

    return res.status(200).json({ mensaje: "Contacto verificado correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al confirmar el código", error: error.message });
  }
};

// Utilizado internamente por inscripciones.controller.js: confirma que el
// verificacion_id recibido corresponde a un código ya verificado, dentro de
// los últimos 30 minutos, y que el valor coincide con el email/teléfono con
// el que se está inscribiendo (para que no verifique un contacto y lo use
// para inscribir a otra persona).
export async function verificacionValida(verificacion_id, valorEsperado) {
  if (!verificacion_id) return false;
  const registro = await codigosVerificacionModel.findOne({
    where: {
      id: verificacion_id,
      verificado: true,
      valor: valorEsperado,
      created_at: { [Op.gt]: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  return !!registro;
}
