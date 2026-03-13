import pool from "../bbdd/conexion.js";
import { MONITOR_QUERY } from "../querys/monitorQuery.js";
import { v4 as uuidv4 } from "uuid";

class MonitorModel {
	static async postMonitor(userId, data) {
		try {
			const uuidMonitor = uuidv4();
			await pool.query(MONITOR_QUERY.CREAR_MONITOR, [
				data.nombreObjetivo,
				data.direccion,
				data.valorEsperado,
				uuidMonitor,
				data.timeOutSegundos,
				data.umbralReintentos,
				userId,
				data.idMetodo,
				data.cadaCuantoSegundos,
			]);
			return { uuid: uuidMonitor };
		} catch (error) {
			console.error(
				"Se ha producido un error al intentar escribir la información del monitor en la base de datos.",
			);
			throw error;
		}
	}
}
export default MonitorModel;
