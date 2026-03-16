import pool from "../bbdd/conexion.js";
import { HEALTH_QUERYES } from "../querys/healthQuerys.js";
class HealthModel {
	static async updateMonitorizacion(status, idMonitor) {
		await pool.query(HEALTH_QUERYES.HISTORICO_POST, [
			status.disponible,
			status.resultado,
			idMonitor,
		]);

		await pool.query(HEALTH_QUERYES.MONITOR_WEB, [
			status.resultado,
			status.disponible,
			idMonitor,
		]);
	}
}
export default HealthModel;
