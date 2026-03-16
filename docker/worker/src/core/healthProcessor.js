import HealthProcessor from "../controller/healthController.js";
import HealthModel from "../models/healthModel.js";
import { addEmailToQueue } from "../eda/queue.js";

export const healthProcessor = async (job) => {
	const { idMonitor, direccion, valorEsperado, timeoutSegundos, type } =
		job.data;

	try {
		let status;
		if (type === "GET") {
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

			const monitorActualizado = await HealthModel.updateMonitorizacion(
				status,
				idMonitor,
			);

			if (monitorActualizado) {
				const { contadorfallos, umbralreintentos, nombreobjetivo } =
					monitorActualizado;

				if (contadorfallos === umbralreintentos) {
					const correoCreador = await HealthModel.getCorreo(idMonitor);

					if (correoCreador) {
						await addEmailToQueue({
							template: "SERVICIO_CAIDO",
							to: correoCreador,
							detectedAt: new Date(),
							description: `Fallo detectado mediante ${type}. Código/Estado: ${status.resultado}`,
							dashboardUrl: process.env.WEB_URL,
							serviceName: nombreobjetivo,
						});
						console.log(
							`[ALERTA] Correo enviado a ${correoCreador} por caída de ${nombreobjetivo}`,
						);
					}
				}
			}
			return status;
		}
	} catch (error) {
		console.error(`Error procesando monitoreo para el ID ${idMonitor}:`, error);
		throw error;
	}
};
