// cron/cron.js
import { CronJob } from "cron";

export const initCron = () => {
	const job = new CronJob(
		"*/10 * * * * *", // Cada 10 segundos para no saturar el log
		function () {
			console.log("Cron ejecutándose: Comprobando tareas pendientes...");
		},
		null,
		true,
		"Europe/Madrid", // Ajustado a tu zona horaria
	);

	job.start();
};
