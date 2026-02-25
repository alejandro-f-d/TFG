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
}

export default RolModel;
