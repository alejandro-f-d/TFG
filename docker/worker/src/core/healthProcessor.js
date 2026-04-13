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
				const {
					contadorfallos,
					umbralreintentos,
					nombreobjetivo,
					statusactual,
				} = monitorActualizado;

				console.log(
					`[JOB] Monitor ${idMonitor} (${direccion}) -> Contador: ${contadorfallos}/${umbralreintentos} | Status DB: ${statusactual}`,
				);

				if (contadorfallos >= umbralreintentos && statusactual !== "caido") {
					console.log(
						`[ALERTA] Umbral alcanzado para ${nombreobjetivo}. Notificando suscriptores...`,
					);

					const correos = await HealthModel.getCorreosSuscriptores(idMonitor);

					if (correos.length > 0) {
						for (const email of correos) {
							await addEmailToQueue({
								template: "SERVICIO_CAIDO",
								to: email,
								detectedAt: new Date(),
								description: `Fallo detectado mediante ${type}. Resultado: ${status.resultado}`,
								dashboardUrl: process.env.WEB_URL,
								serviceName: nombreobjetivo,
							});
						}
						console.log(
							`[ALERTA] Notificaciones de caída enviadas a: ${correos.join(", ")}`,
						);
					}
				} else if (contadorfallos === 0 && statusactual === "caido") {
					console.log(
						`[ALERTA] Servicio ${nombreobjetivo} recuperado. Notificando suscriptores...`,
					);

					const correos =
						await HealthModel.getCorreosSuscriptoresSetOk(idMonitor);

					if (correos.length > 0) {
						for (const email of correos) {
							await addEmailToQueue({
								template: "SERVICIO_RECUPERADO",
								to: email,
								serviceName: nombreobjetivo,
								recoveredAt: new Date(),
								currentStatus: "Funcionando correctamente",
								dashboardUrl: process.env.WEB_URL,
							});
						}
						console.log(
							`[ALERTA] Notificaciones de recuperación enviadas a: ${correos.join(", ")}`,
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
