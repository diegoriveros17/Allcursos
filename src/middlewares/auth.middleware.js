import jwt from "jsonwebtoken";

// Lee el header Authorization: Bearer <token> y devuelve el payload o null
function leerToken(req) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Requiere sesión iniciada. Si no hay token válido, corta con 401.
export const verificarToken = (req, res, next) => {
  const payload = leerToken(req);
  if (!payload) {
    return res
      .status(401)
      .json({ mensaje: "Debes iniciar sesión para realizar esta acción" });
  }
  req.usuario = payload; // { id, persona_id, rol, institucion_id? }
  next();
};

// No exige sesión, pero si viene un token válido lo deja disponible en req.usuario.
// Esto es lo que permite el "login opcional" en la inscripción a cursos.
export const tokenOpcional = (req, res, next) => {
  const payload = leerToken(req);
  if (payload) req.usuario = payload;
  next();
};

// Debe usarse siempre después de verificarToken.
export const verificarRol =
  (...rolesPermitidos) =>
  (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: "Debes iniciar sesión" });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ mensaje: "No tienes permisos para realizar esta acción" });
    }
    next();
  };
