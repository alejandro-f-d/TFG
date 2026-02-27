import pool from "../bbdd/conexion.js";
import { DISPOSITIVOS_QUERY } from "../querys/dispositivosQuery.js";
import { v4 as uuidv4 } from "uuid";

class DispositivosModel {
	static async postDispositivo(data) {
		const uuid = uuidv4();
		const valuesQuery = [
			data.nombre,
			data.puntoMontaje,
			data.capacidad,
			data.capacidadUsada,
			data.tecnologia,
			uuid,
			data.idMaquina,
			data.idTipoDispositivo,
		];
		try {
			await pool.query(DISPOSITIVOS_QUERY.POST_QUERY, valuesQuery);
			return { status: "OK", uuid: uuid };
		} catch (error) {
			console.error(
				"Se ha producido un error al realizar el post del dispositivo.",
				error,
			);
			throw error;
		}
	}
}
export default DispositivosModel;
