import BaseDeDatos from "../bbdd/conexion.js";
import { HEALTH_QUERYS } from "../querys/healthcheckQuery.js";
import { transporter } from "../config/mailer.js"; // Importa tu config de nodemailer
import { redisConnection } from "../config/redis.js"; // Importa tu config de ioredis

class HealthModel {
	static async checkDB() {
		try {
			const startTime = Date.now();
			await BaseDeDatos.query(HEALTH_QUERYS.SELECT);
			return { status: "UP", latency: `${Date.now() - startTime}ms` };
		} catch (error) {
			return { status: "DOWN", error: error.message };
		}
	}

	static async checkRedis() {
		try {
			const startTime = Date.now();
			await redisConnection.ping();
			return { status: "UP", latency: `${Date.now() - startTime}ms` };
		} catch (error) {
			return { status: "DOWN", error: error.message };
		}
	}

	static async checkGoogle() {
		try {
			const startTime = Date.now();
			await transporter.verify();
			return { status: "UP", latency: `${Date.now() - startTime}ms` };
		} catch (error) {
			return { status: "DOWN", error: error.message };
		}
	}
}

export default HealthModel;
