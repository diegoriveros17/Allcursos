import { rolesModel } from "../models/rol.model.js";

export const agregarRoles = async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({ errores: ["El nombre del rol es obligatorio"] });
        }

        const rolExistente = await rolesModel.findOne({ where: { nombre } });
        if (rolExistente) {
            return res.status(400).json({ errores: ["El rol ya se encuentra registrado"] });
        }

        const rol = await rolesModel.create({ nombre });
        return res.status(201).json({ mensaje: "Rol creado correctamente", rol });
    } catch (error) {
        return res.status(500).json({
            mensaje: "Error al intentar crear el rol",
            error: error.message,
        });
    }
};

export const verTodosRoles = async (req, res) => {
    try {
        const roles = await rolesModel.findAll();
        return res.status(200).json({ mensaje: "Lista de roles", roles });
    } catch (error) {
        return res.status(500).json({
            mensaje: "Error al obtener los roles",
            error: error.message,
        });
    }
};

export const verPorIdRoles = async (req, res) => {
    try {
        const rol = await rolesModel.findByPk(req.params.id);
        if (rol) {
            return res.status(200).json({ mensaje: "Rol encontrado", rol });
        } else {
            return res.status(404).json({ mensaje: "Rol no encontrado" });
        }
    } catch (error) {
        return res.status(500).json({
            mensaje: "Error al buscar el rol por ID",
            error: error.message,
        });
    }
};

export const borrarRoles = async (req, res) => {
    try {
        const eliminarRol = await rolesModel.destroy({
            where: { id: req.params.id },
        });
        if (eliminarRol) {
            return res.status(200).json({ mensaje: "Rol eliminado con éxito" });
        } else {
            return res.status(404).json({ mensaje: "No se encontró el rol especificado" });
        }
    } catch (error) {
        return res.status(500).json({
            mensaje: "Error al borrar el rol",
            error: error.message,
        });
    }
};

export const editarRoles = async (req, res) => {
    try {
        const [actualizarRol] = await rolesModel.update(req.body, {
            where: { id: req.params.id },
        });
        if (actualizarRol) {
            const updateRol = await rolesModel.findByPk(req.params.id);
            return res.status(200).json({ mensaje: "Rol actualizado correctamente", updateRol });
        } else {
            return res.status(404).json({ mensaje: "Rol no encontrado" });
        }
    } catch (error) {
        return res.status(500).json({
            mensaje: "Error al actualizar el rol",
            error: error.message,
        });
    }
};