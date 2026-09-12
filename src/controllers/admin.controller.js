import { Op } from "sequelize";
import {
  usuariosModel,
  personasModel,
  rolesModel,
  institucionesModel,
  representanteInstituModel,
  cursosModel,
  categoriasModel,
  inscripcionesModel,
  reportesCursosModel,
} from "../models/index.js";
import { enviarEmail } from "../utils/email.service.js";

// Resumen de métricas para el dashboard del administrador
export const obtenerMetricas = async (req, res) => {
  try {
    const rolCiudadano = await rolesModel.findOne({ where: { nombre: "ciudadano" } });
    const rolRepresentante = await rolesModel.findOne({ where: { nombre: "representante" } });

    const totalUsuarios = await usuariosModel.count();
    const totalCiudadanos = rolCiudadano
      ? await usuariosModel.count({ where: { rol_id: rolCiudadano.id } })
      : 0;
    const totalRepresentantes = rolRepresentante
      ? await usuariosModel.count({ where: { rol_id: rolRepresentante.id } })
      : 0;
    const totalInstituciones = await institucionesModel.count();
    const totalCursos = await cursosModel.count();
    const totalInscripciones = await inscripcionesModel.count({
      where: { estado: { [Op.ne]: "Cancelado" } },
    });

    const representantesPendientes = await usuariosModel.count({
      where: { estado_aprobacion: "pendiente" },
    });

    const reportesPendientes = await reportesCursosModel.count({
      where: { estado: "pendiente" },
    });

    return res.json({
      totalUsuarios,
      totalCiudadanos,
      totalRepresentantes,
      totalInstituciones,
      totalCursos,
      totalInscripciones,
      representantesPendientes,
      reportesPendientes,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener las métricas administrativas",
      error: error.message,
    });
  }
};

// Listar representantes pendientes de aprobación
export const listarRepresentantesPendientes = async (req, res) => {
  try {
    const pendientes = await usuariosModel.findAll({
      where: { estado_aprobacion: "pendiente" },
      include: [
        { model: personasModel, as: "persona" },
        { model: rolesModel, as: "rol" },
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formato = pendientes.map((u) => ({
      id: u.id,
      nombre: u.persona ? `${u.persona.nombre} ${u.persona.apellido}` : "Sin nombre",
      email: u.email_login,
      dni: u.persona?.dni,
      telefono: u.persona?.telefono,
      cargo: u.representaciones?.[0]?.cargo || "No especificado",
      institucion_id: u.representaciones?.[0]?.institucion?.id,
      institucion_nombre: u.representaciones?.[0]?.institucion?.nombre || "Sin institución",
      institucion_cuit: u.representaciones?.[0]?.institucion?.cuit || "Sin CUIT",
      estado_aprobacion: u.estado_aprobacion,
      fecha_registro: u.created_at,
    }));

    return res.json({ pendientes: formato });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al listar representantes pendientes",
      error: error.message,
    });
  }
};

// Aprobar a un representante y su institución
export const aprobarRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await usuariosModel.findByPk(id, {
      include: [
        { model: personasModel, as: "persona" },
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    await usuario.update({ estado_aprobacion: "aprobado", activo: true });

    if (usuario.representaciones?.length > 0 && usuario.representaciones[0].institucion) {
      await usuario.representaciones[0].institucion.update({ estado_aprobacion: "aprobado" });
    }

    // Notificar por correo
    enviarEmail({
      to: usuario.email_login,
      subject: "¡Tu cuenta de representante fue aprobada! - AllCursos",
      html: `
        <h2>¡Buenas noticias, ${usuario.persona?.nombre || "Representante"}!</h2>
        <p>Tu solicitud para representar a <strong>${
          usuario.representaciones?.[0]?.institucion?.nombre || "tu institución"
        }</strong> ha sido <strong>aprobada</strong> por el equipo de administración de AllCursos.</p>
        <p>Ya puedes iniciar sesión y comenzar a publicar tus cursos y capacitaciones.</p>
        <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login.html" style="background:#0d6efd;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Ingresar a la Plataforma</a></p>
      `,
    }).catch((e) => console.error("Error enviando email de aprobación:", e.message));

    return res.json({ mensaje: "Representante e institución aprobados con éxito" });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al aprobar representante",
      error: error.message,
    });
  }
};

// Rechazar a un representante
export const rechazarRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await usuariosModel.findByPk(id, {
      include: [
        { model: personasModel, as: "persona" },
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    await usuario.update({ estado_aprobacion: "rechazado" });

    if (usuario.representaciones?.length > 0 && usuario.representaciones[0].institucion) {
      await usuario.representaciones[0].institucion.update({ estado_aprobacion: "rechazado" });
    }

    return res.json({ mensaje: "Representante rechazado" });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al rechazar representante",
      error: error.message,
    });
  }
};

// Listar todos los usuarios con filtros
export const listarUsuarios = async (req, res) => {
  try {
    const { rol, estado, q } = req.query;
    const where = {};

    if (estado === "activos") where.activo = true;
    if (estado === "inactivos") where.activo = false;

    let includeRol = { model: rolesModel, as: "rol" };
    if (rol) {
      includeRol.where = { nombre: rol };
    }

    let includePersona = { model: personasModel, as: "persona" };
    if (q) {
      includePersona.where = {
        [Op.or]: [
          { nombre: { [Op.like]: `%${q}%` } },
          { apellido: { [Op.like]: `%${q}%` } },
          { dni: { [Op.like]: `%${q}%` } },
        ],
      };
    }

    const usuarios = await usuariosModel.findAll({
      where,
      include: [
        includePersona,
        includeRol,
        {
          model: representanteInstituModel,
          as: "representaciones",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 100,
    });

    const lista = usuarios.map((u) => ({
      id: u.id,
      nombre: u.persona ? `${u.persona.nombre} ${u.persona.apellido}` : "",
      dni: u.persona?.dni,
      email: u.email_login,
      rol: u.rol?.nombre,
      activo: u.activo,
      estado_aprobacion: u.estado_aprobacion,
      institucion: u.representaciones?.[0]?.institucion?.nombre || null,
      created_at: u.created_at,
    }));

    return res.json({ usuarios: lista });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al listar usuarios",
      error: error.message,
    });
  }
};

// Activar o desactivar cuenta de usuario
export const toggleEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.usuario.id) {
      return res.status(400).json({ mensaje: "No puedes desactivar tu propia cuenta de administrador" });
    }

    const usuario = await usuariosModel.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const nuevoEstado = !usuario.activo;
    await usuario.update({ activo: nuevoEstado });

    return res.json({
      mensaje: `Usuario ${nuevoEstado ? "activado" : "desactivado"} con éxito`,
      activo: nuevoEstado,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al actualizar estado del usuario",
      error: error.message,
    });
  }
};

// Cambiar rol de un usuario
export const cambiarRolUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body;

    if (parseInt(id, 10) === req.usuario.id) {
      return res.status(400).json({ mensaje: "No puedes cambiar el rol de tu propia cuenta" });
    }

    const rol = await rolesModel.findOne({ where: { nombre: nuevoRol } });
    if (!rol) {
      return res.status(400).json({ mensaje: "El rol especificado no existe" });
    }

    const usuario = await usuariosModel.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    await usuario.update({
      rol_id: rol.id,
      estado_aprobacion: nuevoRol === "representante" ? "pendiente" : "aprobado",
    });

    return res.json({ mensaje: `Rol actualizado a ${nuevoRol} correctamente` });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cambiar el rol del usuario",
      error: error.message,
    });
  }
};

// Listar todas las instituciones
export const listarInstitucionesAdmin = async (req, res) => {
  try {
    const instituciones = await institucionesModel.findAll({
      include: [
        {
          model: representanteInstituModel,
          as: "representantes",
          include: [
            {
              model: usuariosModel,
              as: "usuario",
              include: [{ model: personasModel, as: "persona" }],
            },
          ],
        },
        { model: cursosModel, as: "cursos", attributes: ["id", "titulo"] },
      ],
      order: [["created_at", "DESC"]],
    });

    const lista = instituciones.map((inst) => ({
      id: inst.id,
      nombre: inst.nombre,
      cuit: inst.cuit,
      estado_aprobacion: inst.estado_aprobacion,
      total_cursos: inst.cursos?.length || 0,
      representantes: (inst.representantes || []).map((r) => ({
        id: r.usuario?.id,
        nombre: r.usuario?.persona
          ? `${r.usuario.persona.nombre} ${r.usuario.persona.apellido}`
          : r.usuario?.email_login,
        cargo: r.cargo,
        email: r.usuario?.email_login,
      })),
      created_at: inst.created_at,
    }));

    return res.json({ instituciones: lista });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al listar instituciones",
      error: error.message,
    });
  }
};

// Listar cursos para moderación
export const listarCursosAdmin = async (req, res) => {
  try {
    const cursos = await cursosModel.findAll({
      include: [
        { model: institucionesModel, as: "institucion", attributes: ["id", "nombre"] },
        { model: categoriasModel, as: "categoria", attributes: ["id", "nombre"] },
        {
          model: reportesCursosModel,
          as: "reportes",
          where: { estado: "pendiente" },
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const lista = cursos.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      modalidad: c.modalidad,
      cupo_maximo: c.cupo_maximo,
      institucion: c.institucion?.nombre,
      categoria: c.categoria?.nombre,
      imagen_url: c.imagen_url,
      reportes_pendientes: c.reportes?.length || 0,
      created_at: c.created_at,
    }));

    return res.json({ cursos: lista });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al listar cursos para administración",
      error: error.message,
    });
  }
};

// Eliminar un curso administrativamente
export const eliminarCursoAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const curso = await cursosModel.findByPk(id);
    if (!curso) {
      return res.status(404).json({ mensaje: "Curso no encontrado" });
    }

    await curso.destroy();
    return res.json({ mensaje: "Curso eliminado por moderación administrativa" });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al eliminar el curso",
      error: error.message,
    });
  }
};

// Listar reportes de cursos
export const listarReportes = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const reportes = await reportesCursosModel.findAll({
      where,
      include: [
        {
          model: cursosModel,
          as: "curso",
          include: [{ model: institucionesModel, as: "institucion" }],
        },
        {
          model: usuariosModel,
          as: "usuario",
          include: [{ model: personasModel, as: "persona" }],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const lista = reportes.map((r) => ({
      id: r.id,
      curso_id: r.curso_id,
      curso_titulo: r.curso?.titulo || "Curso eliminado",
      institucion_nombre: r.curso?.institucion?.nombre || "-",
      reportante: r.usuario?.persona
        ? `${r.usuario.persona.nombre} ${r.usuario.persona.apellido}`
        : r.email_contacto || "Anónimo",
      motivo: r.motivo,
      descripcion: r.descripcion,
      estado: r.estado,
      created_at: r.created_at,
    }));

    return res.json({ reportes: lista });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al listar reportes",
      error: error.message,
    });
  }
};

// Cambiar estado de un reporte (resuelto / desestimado)
export const actualizarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["resuelto", "desestimado", "pendiente"].includes(estado)) {
      return res.status(400).json({ mensaje: "Estado inválido" });
    }

    const reporte = await reportesCursosModel.findByPk(id);
    if (!reporte) {
      return res.status(404).json({ mensaje: "Reporte no encontrado" });
    }

    await reporte.update({ estado });
    return res.json({ mensaje: `Reporte marcado como ${estado}` });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al actualizar reporte",
      error: error.message,
    });
  }
};
