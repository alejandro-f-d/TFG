import jwt from "jsonwebtoken";
export const verificarToken = (req, res, next) => {
	// Esto hace uso de una técnica llamada Bearer Token.
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if (!token) {
		return res
			.status(401)
			.json({ error: "Acceso denegado se requiere token." });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verificamos que sea un token emitido por nosotros.
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(401).json({ error: "Token inválido o expirado." });
	}
};

export const tienePermiso = (slugRequerido, esDinamico = false) => {
	return (req, res, next) => {
		const listaPermisos = req.user?.permisos;
		if (!Array.isArray(listaPermisos)) {
			return res.status(403).json({ error: "Token sin permisos válidos." });
		}
		// Construcción del alias a comprobar.

		// Si es dependiente del recurso como servidorverservicios se le añade el servidor.
		if (esDinamico) {
			const { uuid } = req.params;
			if (!uuid) {
				return res.status(400).json({
					error: "Falta el uuid del recurso para validar el permiso.",
				});
			}
			slugRequerido += `:${uuid}`;
			// console.log(slugRequerido);
		}
		if (
			listaPermisos.includes(slugRequerido) ||
			listaPermisos.includes("admin:total")
		) {
			// Creación del todopoderosisimo admin:total.
			return next();
		}
		return res.status(403).json({
			error: `No tienes el permiso necesario: ${slugRequerido}`,
		});
	};
};
