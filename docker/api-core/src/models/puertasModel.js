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
}
export default PuertasModel;
