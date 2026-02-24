import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";

class ProyectosGitlabModel {
	static async postProyectoGitlab(data) {
		const { nombre, descripcion, fechaInicio, fechaFin, activo } = data;
		const queryPostProyectoGitlab = `INSERT INTO medal.proyectosgitlab(nombre, descripcion, uuidProyecto, fechaincio, fechafin, activo) VALUES($1, $2, $3, $4, $5, $6) RETURNING idProyecto;`;
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
			const resCreateUser = await client.query(
				queryPostProyectoGitlab,
				valuesQueryPost,
			);
			const idProyecto = res.rows[0].idProyecto;
			// TODO: Añadir a los usuarios que son participantes en este proyecto.
			await client.query("COMMIT");
			return { status: "OK" };
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
}

export default ProyectosGitlabModel;
