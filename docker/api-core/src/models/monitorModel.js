import pool from "../bbdd/conexion.js";
import { MONITOR_QUERY } from "../querys/monitorQuery.js";
import { v4 as uuidv4 } from "uuid";

class MonitorModel {
	static async suscribirseUuid(uuid, idUsuario) {
		try {
			const resIdMonitor = await pool.query(MONITOR_QUERY.GET_ID_BY_UUID, [
				uuid,
			]);
			if (resIdMonitor.rowCount === 0) {
				return 2; //404 Not Found.
			}
			const idMonitor = resIdMonitor.rows[0].idmonitor;
			await pool.query(MONITOR_QUERY.SUSCRIBIR_PERSONA, [idMonitor, idUsuario]);
			return 0;
		} catch (error) {
			console.error(
				"Se ha producido un erro al intentar suscribirse a un monitor en específico.",
				error,
				uuid,
				idUsuario,
			);
			throw error;
		}
	}

	static async postMonitor(userId, data) {
		try {
			const uuidMonitor = uuidv4();

			const res = await pool.query(MONITOR_QUERY.CREAR_MONITOR, [
				data.nombreObjetivo,
				data.direccion,
				data.valorEsperado || 200,
				uuidMonitor,
				data.timeoutSegundos || 60,
				data.umbralReintentos || 5,
				userId,
				data.idMetodo,
				data.cadaCuantoSegundos || 86400,
			]);

			// Metemos en la lista de suscriptores el usuario que ha creado el propio monitor.
			await MonitorModel.suscribirseUuid(uuidMonitor, userId);

			return res.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al intentar escribir la información del monitor en la base de datos.",
				error,
			);
			throw error;
		}
	}
	static async verificardueno(uuidMonitor, userId) {
		try {
			const creadorRes = await pool.query(MONITOR_QUERY.GET_CREADOR, [
				uuidMonitor,
			]);
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
	static async deleteMonitorByUuid(uuidMonitor) {
		try {
			const idMonitor = await pool.query(MONITOR_QUERY.DELETE_MONITOR_BY_UUID, [
				uuidMonitor,
			]);
			if (idMonitor.rowCount === 0) {
				return 2;
			}
			return 0;
		} catch (error) {
			console.error("Se ha producido un error al borrar el monitor.", error);
			throw error;
		}
	}

	static async getAllMonitores(page, limit, filtroNombre, propios, userId) {
		try {
			const offset = (page - 1) * limit;
			const pattern = `%${filtroNombre}%`;
			const sqlQuery = propios
				? MONITOR_QUERY.GET_ALL_MONITORES_PROPIOS
				: MONITOR_QUERY.GET_ALL_MONITORES;
			const params = propios
				? [limit, offset, filtroNombre, pattern, userId]
				: [limit, offset, filtroNombre, pattern];
			const result = await pool.query(sqlQuery, params);
			if (result.rows.length === 0) return 2;
			return {
				info: result.rows,
				total: parseInt(result.rows[0].total_registros) || 0,
				page: parseInt(page),
				limit: parseInt(limit),
			};
		} catch (error) {
			console.error("Error en getAllMonitores:", error);
			throw error;
		}
	}

	static async getHistoricoMonitores(uuid) {
		try {
			const res = await pool.query(MONITOR_QUERY.OBTENER_HISTORICO, [uuid]);
			if (res.rowCount === 0) {
				return 2; // Not Found
			}
			return res.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el histórico de un servicio de monitorización.",
				uuid,
				error,
			);
			throw error;
		}
	}
}
export default MonitorModel;
