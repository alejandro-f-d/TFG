import jwt from "jsonwebtoken";
import pool from "../bbdd/conexion.js";
import { AUTH_MIDDLEWARE_QUERY } from "../querys/authMiddlewareQuery.js";

export const verificarToken = async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"];
		const token = authHeader && authHeader.split(" ")[1];
		if (!token) {
			return res
				.status(401)
				.json({ error: "Acceso denegado se requiere token." });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const uuidUsuario = decoded.uuidUsuario;

		if (!uuidUsuario) {
			return res.status(403).json({ error: "Token sin usuario válido." });
		}

		const { rows } = await pool.query(AUTH_MIDDLEWARE_QUERY.GET_PERMS, [
			uuidUsuario,
		]);
		const permisosUsuario = rows.map((r) => r.alias);

		req.user = {
			...decoded,
			permisos: permisosUsuario,
		};

		next();
	} catch (error) {
		console.error("Error verificando token:", error);
		return res.status(401).json({ error: "Token inválido o expirado." });
	}
};

export const tienePermiso = (slugRequerido, esDinamico = false) => {
	return (req, res, next) => {
		try {
			const permisosUsuario = req.user?.permisos;

			if (!Array.isArray(permisosUsuario)) {
				return res.status(403).json({ error: "Usuario sin permisos válidos." });
			}

			let aliasFinal = slugRequerido;
			if (esDinamico) {
				const { uuid } = req.params;
				if (!uuid) {
					return res.status(400).json({
						error: "Falta el uuid del recurso para validar el permiso.",
					});
				}
				aliasFinal = `${slugRequerido}:${uuid}`;
			}

			if (
				permisosUsuario.includes(aliasFinal) ||
				permisosUsuario.includes("admin:total")
			) {
				return next();
			}

			return res.status(403).json({
				error: `No tienes el permiso necesario: ${aliasFinal}`,
			});
		} catch (error) {
			console.error("Error validando permisos:", error);
			return res
				.status(500)
				.json({ error: "Error interno validando permisos." });
		}
	};
};
