import axios from "axios";
import ping from "ping";

class HealthProcessor {
	async getHealthRes(webUrl, wantedRes = 200, timeout = 10) {
		if (!webUrl) throw new Error("URL no proporcionada");
		try {
			const start = Date.now();
			const res = await axios.get(webUrl, {
				timeout: timeout * 1000,
				validateStatus: () => true,
			});
			const responseTime = Date.now() - start;
			return {
				disponible: res.status === wantedRes,
				resultado: res.status,
				tiempoRespuesta: responseTime,
				error: null,
			};
		} catch (error) {
			return {
				disponible: false,
				resultado: error.response ? error.response.status : 0,
				tiempoRespuesta: 0,
				error: error.code || "UNKNOWN_ERROR",
			};
		}
	}
	async ping(direccion, timeout = 10) {
		if (!direccion) throw new Error("Dirección no proporcionada");

		try {
			const start = Date.now();
			const res = await ping.promise.probe(direccion, {
				timeout: timeout,
			});
			const responseTime = Date.now() - start;
			return {
				disponible: res.alive,
				resultado: res.alive ? 1 : 0,
				tiempoRespuesta:
					res.time !== "unknown" ? parseFloat(res.time) : responseTime,
				error: res.alive ? null : "HOST_UNREACHABLE",
			};
		} catch (error) {
			return {
				disponible: false,
				resultado: 0,
				tiempoRespuesta: 0,
				error: error.message || "PING_FAILED",
			};
		}
	}
}

export default new HealthProcessor();
