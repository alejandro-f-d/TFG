import { CronJob } from "cron";
import CaducidadFechas from "../models/caducidadFechas.js";
import { addEmailToQueue } from "../eda/queue.js";

export const initCron = async () => {
	const job = new CronJob(
		"0 0 9 * * *",
		// "0 0 9 * * *", // 0s, 0min, 9h, todos los días, meses y semanas
		function () {
			console.log("Ejecutando la tarea a las nueve de la mañana");
			const cuerpoInfo = await CaducidadFechas.getCaducidad();
			const correosAdministrador = await CaducidadFechas.getCorreoAdministradores();
			addEmailToQueue({
				template: "EXPIRACION_SERVICIOS",
				to: correosAdministrador,
				registros: cuerpoInfo,
			});
		},
		null,
		true,
		"Europe/Madrid", // Asegúrate de poner tu zona horaria real
	);

	console.log("📅 Cron configurado para ejecutarse todos los días a las 09:00");
};
