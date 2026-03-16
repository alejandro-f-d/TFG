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

	static async getCorreo(idMonitor) {
		const res = await pool.query(HEALTH_QUERYES.GET_CORREO, [idMonitor]);

		// Verificamos si existe el registro para evitar errores de "undefined"
		return res.rows.length > 0 ? res.rows[0].correoinstitucional : null;
	}
}

export default HealthModel;
