import axios from "axios";

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
}

export default new HealthProcessor();
