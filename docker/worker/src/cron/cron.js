import { CronJob } from "cron";
import CaducidadFechas from "../models/caducidadFechas.js";
import { addEmailToQueue } from "../eda/queue.js";
import { runGitlabSync } from "../core/gitlabProcessor.js";

export const initCron = async () => {
	const job = new CronJob(
		// "0 30 11 * * *",
		"0 0 9 * * *", // 0s, 0min, 9h, todos los días, meses y semanas
		async function () {
			console.log("Ejecutando la tarea a las nueve de la mañana");
			const cuerpoInfo = await CaducidadFechas.getCaducidad();
			const correosAdministrador =
				await CaducidadFechas.getCorreoAdministradores();
			addEmailToQueue({
				template: "EXPIRACION_SERVICIOS",
				to: correosAdministrador,
				registros: cuerpoInfo,
			});
		},
		null,
		true,
		"Europe/Madrid",
	);
	job.start();
	console.log(
		"Cron de baja de usuarios y peticiones funcionando correctamente.",
	);
};

export const cronGitlab = async () => {
	const job = new CronJob(
		"0 0 */4 * * *", //Ejecución  cada cuatro horas.
		async function () {
			console.log("Ejecutando la tarea de gitlab (Frecuencia: cada 4 horas)");
			try {
				await runGitlabSync();
			} catch (error) {
				console.error("Error en la tarea programada de cada 4 horas:", error);
			}
		},
		null,
		false,
		"Europe/Madrid",
	);

	job.start();
	console.log("Gitlab ejecutado con éxito.");
};
