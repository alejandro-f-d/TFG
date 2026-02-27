import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { ROL_QUERY } from "../querys/rolQuery.js";

class RolModel {
	static async postRole(permisosUsuario, usuarioUuid, data) {
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const resUser = await client.query(ROL_QUERY.GET_ID_USR, [usuarioUuid]);

			if (resUser.rows.length === 0) {
				throw new Error(`Usuario con UUID ${usuarioUuid} no existe en la DB`);
			}
			const idUsuarioNumerico = resUser.rows[0].idusuario;

			const uuidNuevoRol = uuidv4();
			const resPostRole = await client.query(ROL_QUERY.POST_ROLE, [
				data.nombre,
				data.descripcion,
				idUsuarioNumerico,
				uuidNuevoRol,
			]);
			const idRole = resPostRole.rows[0].idrole;

			const resEspeciales = await client.query(
				ROL_QUERY.OBTENER_ID_ESPECIALES,
				[],
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
				await client.query(ROL_QUERY.INSERT_OPERA_CON, [idRole, idPermiso]);
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
		try {
			const res = await pool.query(ROL_QUERY.GET_ROLES, [
				limit,
				offset,
				busqueda,
			]);
			const countRes = await pool.query(ROL_QUERY.COUNT_ROLES, [busqueda]);
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
	static async getRolesByUuid(uuid) {
		try {
			const resGet = await pool.query(ROL_QUERY.GET_ROLE_BY_UUID, [uuid]);
			if (resGet.rows.length === 0) {
				return 2;
			}
			return resGet.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer un get con un determinado uuid para los roles.",
			);
			throw error;
		}
	}

	static async deleteRolByUuid(uuid) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const resIdRole = await client.query(ROL_QUERY.OBTENER_ID_ROL, [uuid]);
			if (!(resIdRole.rowCount > 0)) {
				return 2; //404 no encontrado.
			}
			const idRole = resIdRole.rows[0]?.idrole;
			await client.query(ROL_QUERY.BORRAR_PERTENCE, [idRole]);
			await client.query(ROL_QUERY.BORRAR_PERMISOS, [idRole]);
			await client.query(ROL_QUERY.BORRAR_ROL, [uuid]);
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Se ha producido un error al borrar un role de la base de datos.",
				uuid,
				error,
			);
			throw error;
		} finally {
			client.release();
		}
	}

	static async patchRole(uuid, camposCambiados, permisosUsuarioLogueado = []) {
		const { permisos, ...camposRoles } = camposCambiados;
		const client = await pool.connect();
		let idRole;

		try {
			await client.query("BEGIN");

			const camposPermitidos = ["nombre", "descripcion"];
			const camposFiltrados = {};

			Object.keys(camposRoles).forEach((key) => {
				if (camposPermitidos.includes(key)) {
					camposFiltrados[key] = camposRoles[key];
				}
			});

			const keys = Object.keys(camposFiltrados);

			if (keys.length > 0) {
				const values = Object.values(camposFiltrados);
				values.push(uuid);

				const sqlUpdate = ROL_QUERY.UPDATE_ROLE_DYNAMIC(keys);
				const res = await client.query(sqlUpdate, values);
				idRole = res.rows[0]?.idrole;
			} else {
				const res = await client.query(ROL_QUERY.GET_ID_BY_UUID, [uuid]);
				idRole = res.rows[0]?.idrole;
			}

			if (!idRole) {
				await client.query("ROLLBACK");
				return 2;
			}

			if (permisos !== undefined) {
				// 1. Obtener IDs de permisos especiales para comparar
				const resEspeciales = await client.query(
					ROL_QUERY.OBTENER_ID_ESPECIALES,
				);
				const pNull = resEspeciales.rows.find((p) => p.alias === "null:null");
				const pAdmin = resEspeciales.rows.find(
					(p) => p.alias === "admin:total",
				);

				// 2. Limpiar permisos actuales
				await client.query(ROL_QUERY.DELETE_PERMISOS_ASIGNADOS, [idRole]);

				// 3. Forzar el permiso null:null si existe
				if (pNull && !permisos.includes(Number(pNull.idpermiso))) {
					permisos.push(Number(pNull.idpermiso));
				}

				if (Array.isArray(permisos)) {
					const tieneAdminTotal =
						permisosUsuarioLogueado.includes("admin:total");

					for (const permisoId of permisos) {
						if (pAdmin && Number(permisoId) === Number(pAdmin.idpermiso)) {
							if (!tieneAdminTotal) {
								continue;
							}
						}
						await client.query(ROL_QUERY.INSERT_PERMISO_ROL, [
							idRole,
							permisoId,
						]);
					}
				}
			}

			await client.query("COMMIT");
			return { status: "OK" };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en patchRole (Model):", {
				uuid,
				error: error.message,
			});
			throw error;
		} finally {
			client.release();
		}
	}
}

export default RolModel;
