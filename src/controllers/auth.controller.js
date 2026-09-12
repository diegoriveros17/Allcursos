import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  usuariosModel,
  personasModel,
  rolesModel,
  institucionesModel,
  representanteInstituModel,
  direccionesModel,
  tokensRecuperacionModel,
} from "../models/index.js";
import { enviarEmail } from "../utils/email.service.js";
import { verificacionValida } from "./verificacion.controller.js";

const generarToken = (usuario) => {
  const payload = {
    id: usuario.id,
    persona_id: usuario.persona_id,
    rol: usuario.rol.nombre,
    estado_aprobacion: usuario.estado_aprobacion || "aprobado",
  };
  // Si es representante, adjuntamos su institución para no tener que buscarla en cada request
  if (
    usuario.representaciones &&
    usuario.representaciones.length > 0
  ) {
    payload.institucion_id = usuario.representaciones[0].institucion_id;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const usuarioPublico = (usuario) => ({
  id: usuario.id,
  persona_id: usuario.persona_id,
  nombre: usuario.persona.nombre,
  apellido: usuario.persona.apellido,
  dni: usuario.persona.dni,
  telefono: usuario.persona.telefono,
  avatar_url: usuario.persona.avatar_url,
  email_login: usuario.email_login,
  rol: usuario.rol.nombre,
  canal_notificacion_preferido: usuario.canal_notificacion_preferido,
  estado_aprobacion: usuario.estado_aprobacion || "aprobado",
  email_verificado: usuario.email_verificado || false,
  institucion_id:
    usuario.representaciones && usuario.representaciones.length > 0
      ? usuario.representaciones[0].institucion_id
      : null,
  institucion:
    usuario.representaciones &&
    usuario.representaciones.length > 0 &&
    usuario.representaciones[0].institucion
      ? {
          id: usuario.representaciones[0].institucion.id,
          nombre: usuario.representaciones[0].institucion.nombre,
          cuit: usuario.representaciones[0].institucion.cuit,
          estado_aprobacion:
            usuario.representaciones[0].institucion.estado_aprobacion,
        }
      : null,
});

export const login = async (req, res) => {
  try {
    const { user, password } = req.body;
    if (!user || !password)
      return res
        .status(400)
        .json({ mensaje: "user y password son obligatorios" });

    const usuario = await usuariosModel.findOne({
      where: { email_login: user },
      include: [
        { model: personasModel, as: "persona" },
        { model: rolesModel, as: "rol" },
        { model: representanteInstituModel, as: "representaciones" },
      ],
    });
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    if (!usuario.activo)
      return res.status(403).json({ mensaje: "El usuario está inactivo" });

    if (
      usuario.rol.nombre === "representante" &&
      usuario.estado_aprobacion === "rechazado"
    ) {
      return res.status(403).json({
        mensaje:
          "Tu solicitud de representante fue rechazada por la administración. Comunícate con soporte.",
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password_hash,
    );
    if (!passwordValida)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = generarToken(usuario);
    return res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: usuarioPublico(usuario),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error interno del servidor", error: error.message });
  }
};

export const register = async (req, res) => {
  // Usamos una transacción: si algo falla a mitad de camino (ej. falla crear
  // la institución) no debe quedar un usuario "huérfano" en la base.
  const t = await sequelize.transaction();
  try {
    const {
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      email,
      email_login,
      password,
      password_hash,
      rol = "ciudadano",
      direccion, // string libre (opcional) para ciudadano
      // Datos de institución, sólo si rol === 'representante'
      institucionNombre,
      cuit,
      cargo,
      // Preferencia de cómo quiere recibir avisos de nuevos cursos (ciudadano)
      canal_notificacion_preferido,
      verificacion_id,
    } = req.body;

    const correo = email || email_login;
    const clave = password || password_hash;

    const errores = [];
    if (!nombre) errores.push("El nombre es obligatorio");
    if (!apellido) errores.push("El apellido es obligatorio");
    if (!correo) errores.push("El email es obligatorio");
    if (!clave) errores.push("La contraseña es obligatoria");
    if (!["ciudadano", "representante"].includes(rol))
      errores.push("Rol no válido");
    if (rol === "ciudadano" && !dni)
      errores.push("El DNI es obligatorio para ciudadanos");
    if (rol === "representante" && !institucionNombre)
      errores.push("El nombre de la institución es obligatorio");
    if (!verificacion_id)
      errores.push("Debes verificar tu email antes de registrarte");

    if (errores.length > 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: errores.join(". "), errores });
    }

    // Confirmamos que el email haya sido verificado con el código de 6 dígitos
    const esValida = await verificacionValida(verificacion_id, correo);
    if (!esValida) {
      await t.rollback();
      return res.status(400).json({
        mensaje:
          "El código de verificación de correo no es válido o ha expirado. Por favor solicita uno nuevo.",
        requiereVerificacion: true,
      });
    }

    const existeEmail = await usuariosModel.findOne({
      where: { email_login: correo },
      transaction: t,
    });
    if (existeEmail) {
      await t.rollback();
      return res.status(409).json({ mensaje: "El email ya está registrado" });
    }

    // El DNI de "ciudadano" es obligatorio y único en personas; para
    // representantes que no cargan DNI, generamos uno interno para no
    // romper la restricción NOT NULL de la tabla personas.
    const dniFinal = dni || `REP-${Date.now()}`;
    if (dni) {
      const existeDni = await personasModel.findOne({
        where: { dni },
        transaction: t,
      });
      if (existeDni) {
        await t.rollback();
        return res.status(409).json({ mensaje: "El DNI ya está registrado" });
      }
    }

    let direccionId = null;
    if (rol === "ciudadano" && direccion) {
      const direccionCreada = await direccionesModel.create(
        {
          calle: direccion,
          ciudad: "Formosa",
          provincia: "Formosa",
        },
        { transaction: t },
      );
      direccionId = direccionCreada.id;
    }

    const persona = await personasModel.create(
      {
        nombre,
        apellido,
        dni: dniFinal,
        fecha_nacimiento: fecha_nacimiento || null,
        direccion_id: direccionId,
      },
      { transaction: t },
    );

    const rolEncontrado = await rolesModel.findOne({
      where: { nombre: rol },
      transaction: t,
    });
    if (!rolEncontrado) {
      await t.rollback();
      return res.status(400).json({ mensaje: "Rol no válido" });
    }

    const passwordHash = await bcrypt.hash(clave, 10);
    const canalValido = ["Email", "WhatsApp", "Ambos"].includes(
      canal_notificacion_preferido,
    )
      ? canal_notificacion_preferido
      : "Email";
    const estadoAprobacion = rol === "representante" ? "pendiente" : "aprobado";

    const usuario = await usuariosModel.create(
      {
        persona_id: persona.id,
        rol_id: rolEncontrado.id,
        email_login: correo,
        password_hash: passwordHash,
        acepta_notificaciones: rol === "ciudadano",
        canal_notificacion_preferido: canalValido,
        estado_aprobacion: estadoAprobacion,
        email_verificado: true,
      },
      { transaction: t },
    );

    // Si se registra como representante, creamos su institución y el vínculo
    if (rol === "representante") {
      const institucion = await institucionesModel.create(
        {
          nombre: institucionNombre,
          cuit: cuit || null,
          estado_aprobacion: "pendiente",
        },
        { transaction: t },
      );
      await representanteInstituModel.create(
        {
          usuario_id: usuario.id,
          institucion_id: institucion.id,
          cargo: cargo || null,
        },
        { transaction: t },
      );
    }

    await t.commit();
    return res.status(201).json({
      mensaje:
        rol === "representante"
          ? "Registro completado con éxito. Tu cuenta de representante e institución quedó en estado 'pendiente' a la espera de la aprobación de un administrador."
          : "Usuario registrado con éxito",
      usuario: {
        id: usuario.id,
        persona_id: persona.id,
        email_login: usuario.email_login,
        rol,
        estado_aprobacion: estadoAprobacion,
      },
    });
  } catch (error) {
    await t.rollback();
    return res
      .status(500)
      .json({ mensaje: "Error al registrar usuario", error: error.message });
  }
};

// Devuelve los datos del usuario autenticado (útil para refrescar el dashboard)
export const perfil = async (req, res) => {
  try {
    const usuario = await usuariosModel.findByPk(req.usuario.id, {
      include: [
        { model: personasModel, as: "persona" },
        { model: rolesModel, as: "rol" },
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
    });
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    return res.json({ usuario: usuarioPublico(usuario) });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener el perfil", error: error.message });
  }
};

// ============================================================
// RECUPERACIÓN DE CONTRASEÑA (código de 6 dígitos por email)
// ============================================================

const generarCodigo = () =>
  crypto.randomInt(100000, 999999).toString(); // 6 dígitos

export const solicitarRecuperacion = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ mensaje: "Debes indicar tu email" });

    const usuario = await usuariosModel.findOne({
      where: { email_login: email },
    });

    // Respuesta genérica siempre, exista o no el email: evita que alguien
    // pueda usar este endpoint para averiguar qué emails están registrados.
    const mensajeGenerico =
      "Si el email está registrado, te enviamos un código de recuperación.";

    if (!usuario) return res.status(200).json({ mensaje: mensajeGenerico });

    const codigo = generarCodigo();
    const fecha_expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await tokensRecuperacionModel.create({
      usuario_id: usuario.id,
      token: codigo,
      fecha_expiracion,
      usado: false,
    });

    await enviarEmail({
      to: usuario.email_login,
      subject: "Código para recuperar tu contraseña - AllCursos",
      html: `
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Tu código de verificación es:</p>
        <h2 style="letter-spacing:4px;">${codigo}</h2>
        <p>Este código vence en 15 minutos. Si no fuiste vos, ignorá este mensaje.</p>
      `,
    });

    return res.status(200).json({ mensaje: mensajeGenerico });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al solicitar la recuperación", error: error.message });
  }
};

export const confirmarRecuperacion = async (req, res) => {
  try {
    const { email, codigo, password } = req.body;
    if (!email || !codigo || !password)
      return res
        .status(400)
        .json({ mensaje: "Email, código y nueva contraseña son obligatorios" });

    const usuario = await usuariosModel.findOne({ where: { email_login: email } });
    if (!usuario)
      return res.status(400).json({ mensaje: "Código inválido o vencido" });

    const tokenValido = await tokensRecuperacionModel.findOne({
      where: {
        usuario_id: usuario.id,
        token: codigo,
        usado: false,
        fecha_expiracion: { [Op.gt]: new Date() },
      },
      order: [["id", "DESC"]],
    });

    if (!tokenValido)
      return res.status(400).json({ mensaje: "Código inválido o vencido" });

    if (password.length < 4)
      return res
        .status(400)
        .json({ mensaje: "La contraseña debe tener al menos 4 caracteres" });

    const passwordHash = await bcrypt.hash(password, 10);
    await usuario.update({ password_hash: passwordHash });
    await tokenValido.update({ usado: true });

    return res.status(200).json({ mensaje: "Contraseña actualizada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al confirmar la recuperación", error: error.message });
  }
};

// ============================================================
// GESTIÓN DE LA PROPIA CUENTA (Mi Cuenta)
// ============================================================

// Actualiza datos personales (y de la institución, si es representante)
export const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, institucionNombre, cuit } = req.body;

    const usuario = await usuariosModel.findByPk(req.usuario.id, {
      include: [
        { model: personasModel, as: "persona" },
        { model: representanteInstituModel, as: "representaciones" },
      ],
    });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    if (!nombre || !apellido)
      return res.status(400).json({ mensaje: "Nombre y apellido son obligatorios" });

    if (email && email !== usuario.email_login) {
      const existeEmail = await usuariosModel.findOne({ where: { email_login: email } });
      if (existeEmail)
        return res.status(409).json({ mensaje: "Ese email ya está en uso por otra cuenta" });
      await usuario.update({ email_login: email });
    }

    await usuario.persona.update({
      nombre,
      apellido,
      telefono: telefono || null,
      ...(req.avatar_url ? { avatar_url: req.avatar_url } : {}),
    });

    if (
      req.usuario.rol === "representante" &&
      usuario.representaciones?.length > 0 &&
      (institucionNombre || cuit)
    ) {
      const institucion = await institucionesModel.findByPk(
        usuario.representaciones[0].institucion_id,
      );
      if (institucion) {
        await institucion.update({
          nombre: institucionNombre || institucion.nombre,
          cuit: cuit !== undefined ? cuit || null : institucion.cuit,
        });
      }
    }

    return res.status(200).json({ mensaje: "Datos actualizados correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al actualizar tus datos", error: error.message });
  }
};

export const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva)
      return res.status(400).json({ mensaje: "Faltan datos" });
    if (passwordNueva.length < 4)
      return res
        .status(400)
        .json({ mensaje: "La nueva contraseña debe tener al menos 4 caracteres" });

    const usuario = await usuariosModel.findByPk(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const esCorrecta = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!esCorrecta)
      return res.status(401).json({ mensaje: "La contraseña actual es incorrecta" });

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ password_hash: nuevoHash });

    return res.status(200).json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al cambiar la contraseña", error: error.message });
  }
};

// Desactiva la cuenta (no se borra físicamente para no romper el historial
// de cursos/inscripciones ya asociado). Un usuario inactivo no puede
// volver a iniciar sesión.
export const eliminarCuenta = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ mensaje: "Debes confirmar tu contraseña" });

    const usuario = await usuariosModel.findByPk(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const esCorrecta = await bcrypt.compare(password, usuario.password_hash);
    if (!esCorrecta)
      return res.status(401).json({ mensaje: "La contraseña es incorrecta" });

    await usuario.update({ activo: false });

    return res.status(200).json({ mensaje: "Tu cuenta fue desactivada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar la cuenta", error: error.message });
  }
};
