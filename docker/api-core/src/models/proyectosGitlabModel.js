import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { PROYECTOS_QUERY } from "../querys/proyectosGitlabQuery.js";

class ProyectosGitlabModel {
	static async postProyectoGitlab(data, idGitlab) {
		const {
			nombre,
			descripcion,
			fechaInicio,
			fechaFin,
			activo,
			participantes,
		} = data;
		console.log("La fecha de inicio que llega al back es:", fechaInicio);
		const client = await pool.connect();
		try {
			const uuid = uuidv4();
			const valuesQueryPost = [
				nombre,
				descripcion,
				uuid,
				fechaInicio,
				fechaFin,
				activo,
				idGitlab,
			];
			await client.query("BEGIN");
			const resCreateProyecto = await client.query(
				PROYECTOS_QUERY.POST,
				valuesQueryPost,
			);
			const idProyecto = resCreateProyecto.rows[0].idproyecto;
			if (Array.isArray(data.participantes)) {
				for (const participanteId of data.participantes) {
					await client.query(PROYECTOS_QUERY.ADD_PARTICIPANTE, [
						participanteId,
						idProyecto,
					]);
				}
			}
			await client.query("COMMIT");
			return { status: "OK", uuid: uuid };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Ha ocurrido un error al hacer el post de un proyecto de gitlab.",
				data,
				error,
			);
			throw error;
		} finally {
			client.release();
		}
	}

	static async getAllProyects(page, limit, filtroNombre) {
		const offset = (page - 1) * limit;
		const busqueda = `%${filtroNombre}%`;

		try {
			const res = await pool.query(PROYECTOS_QUERY.GET_ALL_PROYECTS, [
				limit,
				offset,
				busqueda,
			]);
			const countRes = await pool.query(PROYECTOS_QUERY.COUNT_NOMBRE, [
				busqueda,
			]);
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
				"Error al hacer un get de all proyects.",
				page,
				limit,
				filtroNombre,
				error,
			);
			throw error;
		}
	}
	static async getProyectoGitlabByUuid(uuidProyecto) {
		try {
			const res = await pool.query(PROYECTOS_QUERY.GET_PROYECTO_UUID, [
				uuidProyecto,
			]);
			return res.rows[0];
		} catch (error) {
			console.error("Error en getProyectoGitlabByUuid:", error);
			throw error;
		}
	}

	static async patchProyecto(uuidProyecto, camposCambiados) {
		const client = await pool.connect();
		const { participantes, ...restoCampos } = camposCambiados;

		try {
			await client.query("BEGIN");

			const camposPermitidos = [
				"nombre",
				"descripcion",
				"fechainicio",
				"fechafin",
				"activo",
			];
			const camposFiltrados = {};

			Object.keys(restoCampos).forEach((key) => {
				if (camposPermitidos.includes(key)) {
					camposFiltrados[key] = restoCampos[key];
				}
			});

			const keys = Object.keys(camposFiltrados);
			let idProyecto;

			if (keys.length === 0) {
				const check = await client.query(PROYECTOS_QUERY.GET_ID_PROYECTO, [
					uuidProyecto,
				]);
				if (check.rows.length === 0) return 2;
				idProyecto = check.rows[0].idproyecto;
			} else {
				const values = Object.values(camposFiltrados);
				values.push(uuidProyecto);
				const sqlUpdate = PROYECTOS_QUERY.UPDATE_PROYECTO_GITLAB(keys);
				const res = await client.query(sqlUpdate, values);

				if (res.rowCount === 0) {
					await client.query("ROLLBACK");
					return 2;
				}
				idProyecto = res.rows[0].idproyecto;
			}

			if (participantes !== undefined) {
				await client.query(PROYECTOS_QUERY.DELETE_PARTICIPANTES, [idProyecto]);

				if (Array.isArray(participantes)) {
					for (const participanteId of participantes) {
						await client.query(PROYECTOS_QUERY.INSERT_PARTICIPANTE, [
							participanteId,
							idProyecto,
						]);
					}
				}
			}
			await client.query("COMMIT");
			return { status: "OK", idProyecto };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en patchProyecto (Model):", {
				uuidProyecto,
				error: error.message,
			});
			throw error;
		} finally {
			client.release();
		}
	}
	static async getGitlabIdByIds(ids) {
		if (!ids || ids.length === 0) return [];
		const client = await pool.connect();
		try {
			const res = await client.query(PROYECTOS_QUERY.GET_ID_USERS_GITLAB, [
				ids,
			]);
			return res.rows.map((row) => row.gitlab);
		} catch (error) {
			console.error("Error en getGitlabUsernamesByIds:", error.message);
			throw error;
		} finally {
			client.release();
		}
	}
	static async getEstado(uuid) {
		try {
			const resStatus = await pool.query(PROYECTOS_QUERY.GET_ESTADO, [uuid]);
			if (resStatus.rowCount === 0) {
				return 2;
			}
			return {
				status: resStatus.rows[0].activo,
				idGitlab: resStatus.rows[0].idgitlab,
			};
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el estado de un proyecto en la base de datos",
				uuid,
				error,
			);
			throw error;
		}
	}
	static async setStatus(uuid, status) {
		try {
			await pool.query(PROYECTOS_QUERY.SET_STATUS, [uuid, status]);
		} catch (error) {
			console.error(
				"Se ha producido un error al establecer el status",
				uuid,
				error,
			);
			throw error;
		}
	}

	static async getGitlabIdsByUserIds(ids) {
		if (!ids || ids.length === 0) return [];

		const client = await pool.connect();
		try {
			const query = `
            SELECT u.gitlab
            FROM unnest($1::int[]) WITH ORDINALITY AS input(idusuario, orden)
            LEFT JOIN medal.usuario u ON u.idusuario = input.idusuario
            ORDER BY input.orden;
        `;

			const res = await client.query(query, [ids]);

			return res.rows.map((row) => row.gitlab);
		} catch (error) {
			console.error("Error en getGitlabIdsByUserIds (Model):", error.message);
			throw error;
		} finally {
			client.release();
		}
	}
}

export default ProyectosGitlabModel;
