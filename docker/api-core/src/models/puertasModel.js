import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { PUERTAS_QUERY } from "../querys/puertasQuery.js";
class PuertasModel {
	static async postPuerta(nombre, ubicacion) {
		const uuidPuerta = uuidv4();
		try {
			await pool.query(PUERTAS_QUERY.POST_PUERTA, [
				nombre,
				ubicacion,
				uuidPuerta,
			]);
			return { status: "OK", id: uuidPuerta };
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer el post de la puerta:",
				uuidPuerta,
				nombre,
				ubicacion,
				error,
			);
			throw error;
		}
	}
	static async getPuertas(page, limit, filtroNombre = "") {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const res = await pool.query(PUERTAS_QUERY.GET_ALL_PAGINADO, [
				limit,
				offset,
				busqueda,
			]);
			return res.rows;
		} catch (error) {
			console.error("Error en getAllInfoServicios:", error.message);
			throw error;
		}
	}
	static async getPuertasByUuid(uuid) {
		try {
			const resGet = await pool.query(PUERTAS_QUERY.GET_BY_UUID, [uuid]);
			if (resGet.rows.length === 0) {
				return 2;
			}
			return resGet.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error con el get de las puertas by uuid.",
				uuid,
				error,
			);
		}
	}
	static async deleteByUuid(uuid) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const resIdPuerta = await client.query(PUERTAS_QUERY.OBTENER_ID, [uuid]);
			if (resIdPuerta.rows.length === 0) {
				await client.query("ROLLBACK");
				return 2;
			}
			const idPuerta = resIdPuerta.rows[0].idpuerta;
			await client.query(PUERTAS_QUERY.DELETE_USER_ASOCIADO, [idPuerta]);
			await client.query(PUERTAS_QUERY.DELETE_PUERTA, [uuid]);
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}
export default PuertasModel;
