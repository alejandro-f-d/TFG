import HealthProcessor from "../controller/healthController.js";
import HealthModel from "../models/healthModel.js";
export const healthProcessor = async (job) => {
	const { idMonitor, direccion, valorEsperado, timeoutSegundos, type } =
		job.data;
	try {
		let status;
		if (type === "GET") {
			//HTTP (Capa 7)
			status = await HealthProcessor.getHealthRes(
				direccion,
				valorEsperado,
				timeoutSegundos,
			);
		} else if (type === "PING") {
			const host = direccion
				.replace(/^(https?:\/\/)?(www\.)?/, "")
				.split("/")[0];
			status = await HealthProcessor.ping(host, timeoutSegundos);
		}
		if (status) {
			status.idMonitor = idMonitor;
			await HealthModel.updateMonitorizacion(status, idMonitor);
			return status;
		}
	} catch (error) {
		console.error(`Error procesando monitoreo para el ID ${idMonitor}:`, error);
		throw error;
	}
};
