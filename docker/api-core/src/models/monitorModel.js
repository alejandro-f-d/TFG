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
	static async verificardueno(uuidMonitor, userId) {
		try {
			const creadorRes = await pool.query(MONITOR_QUERY.GET_CREADOR);
			if (creadorRes.rowCount === 0) {
				return 2;
			}
			return creadorRes.rows[0].idusuario === userId;
		} catch (error) {
			console.error(
				"Se ha producido un error al verificar el dueño de un monitor",
				error,
			);
			throw error;
		}
	}
	static async getMonitorByUuid(uuidMonitor) {
		try {
			const resInfo = await pool.query(MONITOR_QUERY.GET_MONITOR_UUID, [
				uuidMonitor,
			]);
			if (resInfo.rowCount === 0) {
				return 2;
			}
			return resInfo.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer el getMonitorByUuid.",
				uuidMonitor,
			);
			throw error;
		}
	}
}
export default MonitorModel;
