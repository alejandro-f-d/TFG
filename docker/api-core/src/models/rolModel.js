import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";

class RolModel {
	static async postRole(permisosUsuario, usuarioUuid, data) {
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const resUser = await client.query(
				"SELECT idusuario FROM medal.usuario WHERE uuidusuario = $1",
				[usuarioUuid],
			);

			if (resUser.rows.length === 0) {
				throw new Error(`Usuario con UUID ${usuarioUuid} no existe en la DB`);
			}
			const idUsuarioNumerico = resUser.rows[0].idusuario;

			const uuidNuevoRol = uuidv4();
			const queryPostRole = `
            INSERT INTO medal.roles(nombre, descripcion, idusuario, uuidrole) 
            VALUES($1, $2, $3, $4) 
            RETURNING idrole;
        `;

			const resPostRole = await client.query(queryPostRole, [
				data.nombre,
				data.descripcion,
				idUsuarioNumerico,
				uuidNuevoRol,
			]);
			const idRole = resPostRole.rows[0].idrole;

			const resEspeciales = await client.query(
				"SELECT idpermiso, alias FROM medal.permisos WHERE alias IN ('null:null', 'admin:total');",
			);
			const pNull = resEspeciales.rows.find((p) => p.alias === "null:null");
			const pAdmin = resEspeciales.rows.find((p) => p.alias === "admin:total");

			let idsAAsignar = Array.isArray(data.permisos)
				? data.permisos.map((id) => Number(id))
				: [];

			// Forzar inclusión de null:null si existe
			if (pNull && !idsAAsignar.includes(Number(pNull.idpermiso))) {
				idsAAsignar.push(Number(pNull.idpermiso));
			}

			const esAdmin = permisosUsuario.includes("admin:total");

			for (const idPermiso of idsAAsignar) {
				if (isNaN(idPermiso)) continue;
				// Si intenta asignar admin:total, validar que el creador sea admin
				if (pAdmin && idPermiso === Number(pAdmin.idpermiso) && !esAdmin) {
					console.warn(
						`Intento de asignación de admin:total bloqueado para usuario ${usuarioUuid}`,
					);
					continue;
				}
				await client.query(
					"INSERT INTO medal.operacon(idrole, idpermiso) VALUES ($1, $2)",
					[idRole, idPermiso],
				);
			}

			await client.query("COMMIT");
			return { status: "OK", uuid: uuidNuevoRol };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	static async getRoles(page, limit, filtroNombre) {
		const offset = (page - 1) * limit;
		const busqueda = `%${filtroNombre}%`;
		const query = `SELECT 
    r.*,
    COALESCE(
        json_agg(
            json_build_object(
                'idUsuario', u.idusuario,
                'nombre', u.nombre,
                'apellido1', u.apellido1,
                'apellido2', u.apellido2
            )
        ) FILTER (WHERE u.idusuario IS NOT NULL), '[]'
    ) AS usuarios
FROM medal.roles r
LEFT JOIN medal.rolestiene rt ON r.idrole = rt.idrole
LEFT JOIN medal.usuario u ON rt.idusuario = u.idusuario
WHERE r.nombre ILIKE $3
GROUP BY r.idrole
ORDER BY r.idrole ASC
LIMIT $1 OFFSET $2;`;
		try {
			const res = await pool.query(query, [limit, offset, busqueda]);
			const countQuery = `SELECT COUNT(*) FROM medal.roles WHERE nombre ILIKE $1`;
			const countRes = await pool.query(countQuery, [busqueda]);
			const totalItems = parseInt(countRes.rows[0].count);
			return {
				status: "OK",
				rows: res.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
					totalItems: totalItems,
				},
			};
		} catch (error) {
			console.error(
				"Se ha producido un error con el get de los roles",
				page,
				limit,
				filtroNombre,
				error,
			);
			throw error;
		}
	}
}

export default RolModel;
