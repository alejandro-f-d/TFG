import pool from "../bbdd/conexion.js";
import { HEALTH_QUERYES } from "../querys/healthQuerys.js";

class HealthModel {
	static async updateMonitorizacion(status, idMonitor) {
		await pool.query(HEALTH_QUERYES.HISTORICO_POST, [
			status.disponible,
			status.resultado,
			idMonitor,
		]);

		const res = await pool.query(HEALTH_QUERYES.MONITOR_WEB, [
			status.resultado,
			status.disponible,
			idMonitor,
		]);

		return res.rows[0];
	}

	static async getCorreosSuscriptores(idMonitor) {
		await pool.query(HEALTH_QUERYES.SET_CAIDO, [idMonitor]);

		const res = await pool.query(HEALTH_QUERYES.GET_CORREOS_SUSCRITOS, [
			idMonitor,
		]);
		return res.rows.map((row) => row.correoinstitucional);
	}

	static async getCorreosSuscriptoresSetOk(idMonitor) {
		await pool.query(HEALTH_QUERYES.SET_OK, [idMonitor]);

		const res = await pool.query(HEALTH_QUERYES.GET_CORREOS_SUSCRITOS, [
			idMonitor,
		]);
		return res.rows.map((row) => row.correoinstitucional);
	}
}

export default HealthModel;
