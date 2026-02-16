import jwt from 'jsonwebtoken';
export const verificarToken = (req, res, next) => {
  // Esto hace uso de una técnica llamada Bearer Token.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
        return res.status(403).json({ error: "Acceso denegado." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verificamos que sea un token emitido por nosotros.
    req.user = decoded;
    next();
  } catch(error){
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}
export const tienePermiso = (permisoIdRequerido) => {
    return (req, res, next) => {
       const listaPermisos = req.user?.permisos;
        if (!Array.isArray(listaPermisos)) {
            console.error("ERROR: No se encontraron permisos en el token del usuario:", req.user?.id);
            return res.status(403).json({ error: "El token no contiene permisos válidos." });
        }
        if (!listaPermisos.includes(permisoIdRequerido)) {
            return res.status(403).json({ error: "No tienes autorización para realizar esta operación." });
        }

        next();
    };
};

