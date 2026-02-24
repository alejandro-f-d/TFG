import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";

class ProyectosGitlabModel {
	static async postProyectoGitlab(data) {
		const {
			nombre,
			descripcion,
			fechaInicio,
			fechaFin,
			activo,
			participantes,
		} = data;
		const queryPostProyectoGitlab = `INSERT INTO medal.proyectosgitlab(nombre, descripcion, uuidProyecto, fechainicio, fechafin, activo) VALUES($1, $2, $3, $4, $5, $6) RETURNING idProyecto;`;
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
			];
			await client.query("BEGIN");
			const resCreateProyecto = await client.query(
				queryPostProyectoGitlab,
				valuesQueryPost,
			);
			const idProyecto = resCreateProyecto.rows[0].idproyecto;
			if (Array.isArray(data.participantes)) {
				const queryAddParticipante = `INSERT INTO medal.participa(idusuario, idproyecto) VALUES($1, $2);`;
				for (const participanteId of data.participantes) {
					await client.query(queryAddParticipante, [
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
		const query = `SELECT * FROM medal.proyectosgitlab WHERE nombre ILIKE $3 ORDER BY idproyecto ASC LIMIT $1 OFFSET $2;`;

		try {
			const res = await pool.query(query, [limit, offset, busqueda]);
			const countQuery = `SELECT COUNT(*) FROM medal.proyectosgitlab WHERE nombre ILIKE $1;`;
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
				"Error al hacer un get de all proyects.",
				page,
				limit,
				filtroNombre,
				error,
			);
			throw error;
		}
	}
}

export default ProyectosGitlabModel;
