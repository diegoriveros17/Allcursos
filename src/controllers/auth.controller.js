import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sequelize } from "../config/database.js";
import {
  usuariosModel,
  personasModel,
  rolesModel,
  institucionesModel,
  representanteInstituModel,
  direccionesModel,
} from "../models/index.js";

const generarToken = (usuario) => {
  const payload = {
    id: usuario.id,
    persona_id: usuario.persona_id,
    rol: usuario.rol.nombre,
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
  email_login: usuario.email_login,
  rol: usuario.rol.nombre,
  institucion_id:
    usuario.representaciones && usuario.representaciones.length > 0
      ? usuario.representaciones[0].institucion_id
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
    if (errores.length > 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: errores.join(". "), errores });
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
    const usuario = await usuariosModel.create(
      {
        persona_id: persona.id,
        rol_id: rolEncontrado.id,
        email_login: correo,
        password_hash: passwordHash,
      },
      { transaction: t },
    );

    // Si se registra como representante, creamos su institución y el vínculo
    if (rol === "representante") {
      const institucion = await institucionesModel.create(
        { nombre: institucionNombre, cuit: cuit || null },
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
      mensaje: "Usuario registrado con éxito",
      usuario: {
        id: usuario.id,
        persona_id: persona.id,
        email_login: usuario.email_login,
        rol,
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
        { model: representanteInstituModel, as: "representaciones" },
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
