import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { GITLAB_QUERYS } from "../querys/gitlabQuerys.js";

class GitlabModel {
	static async autoCreateProyect(
		idProyecto,
		nombre,
		descripcion,
		miembros,
		fechaInicio,
		archived,
	) {
		const uuidProyecto = uuidv4();
		const activo = !archived;

		try {
			const proyectoResult = await pool.query(GITLAB_QUERYS.ALTA_PROYECTO, [
				nombre,
				descripcion,
				uuidProyecto,
				fechaInicio,
				idProyecto,
				activo,
			]);

			const idProyectoInterno = proyectoResult.rows[0].idproyecto;

			for (const miembro of miembros) {
				const gitlabUserId = miembro.id;

				const miembroResult = await pool.query(
					GITLAB_QUERYS.GET_ID_USUARIO_BY_GITLAB_ID,
					[gitlabUserId],
				);

				if (miembroResult.rowCount !== 0) {
					const idMiembroInsertar = miembroResult.rows[0].idusuario;

					await pool.query(GITLAB_QUERYS.ALTA_USUARIOS, [
						idMiembroInsertar,
						idProyectoInterno,
					]);
				} // else {
				// 	// console.log(
				// 	// 	`Miembro con ID Gitlab ${miembro.id} todavía no dado de alta en el sistema.`,
				// 	// );
				// }
			}
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer el alta de un proyecto.",
				error,
			);
			throw error;
		}
	}
}

export default GitlabModel;
