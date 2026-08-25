// controllers/usuarios.controller.js
import { usuariosModel } from "../models/usuario.model.js";
import { personasModel } from "../models/persona.model.js";
import { rolesModel } from "../models/rol.model.js";

export const agregarUsuarios = async (req, res) => {
  try {
    const {
      persona_id,
      rol_id,
      email_login,
      password_hash,
      acepta_notificaciones,
    } = req.body;
    const errores = [];

    if (!persona_id) errores.push("Debe asociar una persona");
    if (!rol_id) errores.push("Debe definir un rol");
    if (!email_login) errores.push("El email es obligatorio");
    if (!password_hash) errores.push("La contraseña es obligatoria");

    if (errores.length > 0) return res.status(400).json({ errores });

    const usuario = await usuariosModel.create({
      persona_id,
      rol_id,
      email_login,
      password_hash,
      acepta_notificaciones,
    });
    return res
      .status(201)
      .json({ mensaje: "Usuario creado correctamente", usuario });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al crear usuario", error: error.message });
  }
};

export const verTodosUsuarios = async (req, res) => {
  try {
    const usuarios = await usuariosModel.findAll({
      attributes: { exclude: ["password_hash"] },
      include: [
        { model: personasModel, as: "persona" },
        { model: rolesModel, as: "rol" },
      ],
    });
    return res.status(200).json({ mensaje: "Todos los usuarios", usuarios });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al obtener usuarios", error: error.message });
  }
};

export const verPorIdUsuarios = async (req, res) => {
  try {
    const usuario = await usuariosModel.findByPk(req.params.id, {
      attributes: { exclude: ["password_hash"] },
      include: [
        { model: personasModel, as: "persona" },
        { model: rolesModel, as: "rol" },
      ],
    });
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    return res.status(200).json({ mensaje: "Usuario encontrado", usuario });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al ver usuario por id", error: error.message });
  }
};

export const borrarUsuarios = async (req, res) => {
  try {
    const eliminados = await usuariosModel.destroy({
      where: { id: req.params.id },
    });
    if (!eliminados)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    return res.status(200).json({ mensaje: "Usuario eliminado con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al eliminar usuario", error: error.message });
  }
};

export const editarUsuarios = async (req, res) => {
  try {
    const [actualizados] = await usuariosModel.update(req.body, {
      where: { id: req.params.id },
    });
    if (!actualizados)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    const usuarioActualizado = await usuariosModel.findByPk(req.params.id, {
      attributes: { exclude: ["password_hash"] },
    });
    return res
      .status(200)
      .json({ mensaje: "Usuario actualizado", usuarioActualizado });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al editar usuario", error: error.message });
  }
};
