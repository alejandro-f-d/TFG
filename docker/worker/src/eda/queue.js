import { Queue } from "bullmq";
import IORedis from "ioredis";
import pool from "../bbdd/conexion.js";

import { QUEUE_MAIL, QUEUE_HEALTH } from "./constants.js";

const connection = new IORedis(process.env.REDIS_URL, {
	maxRetriesPerRequest: null,
});

const defaultJobOptions = {
	attempts: 3,
	backoff: { type: "exponential", delay: 1000 },
	removeOnComplete: true,
	removeOnFail: { age: 24 * 3600 },
};

const mailQueue = new Queue(QUEUE_MAIL, { connection, defaultJobOptions });

const monitorQueue = new Queue(QUEUE_HEALTH, { connection, defaultJobOptions });

export const addEmailToQueue = async (payload) => {
	try {
		const job = await mailQueue.add("send-email", payload);
		console.log(`[Queue-Mail] Trabajo ID ${job.id} enviado a Redis`);
		return job;
	} catch (err) {
		console.error("[Queue-Mail] Error:", err.message);
	}
};

export const loadMonitorsToRedis = async () => {
	try {
		const res = await pool.query(
			`
            SELECT 
                idmonitor, 
                uuidmonitoreo, 
                direccion, 
                valoresperado, 
                timeoutsegundos, 
                cadacuantosegundos,
                idmetodo 
            FROM medal.monitoreoWeb
        `,
			[],
		);

		const monitores = res.rows;

		const repeatableJobs = await monitorQueue.getRepeatableJobs();
		for (const job of repeatableJobs) {
			await monitorQueue.removeRepeatableByKey(job.key);
		}

		for (const m of monitores) {
			const job = await monitorQueue.add(
				"check-health",
				{
					idMonitor: m.idmonitor,
					direccion: m.direccion,
					valorEsperado: m.valoresperado,
					timeoutSegundos: m.timeoutsegundos,
					type: m.idmetodo === 1 ? "GET" : "PING",
				},
				{
					repeat: { every: m.cadacuantosegundos * 1000 },
					jobId: m.uuidmonitoreo, // Esto evita duplicados
				},
			);
			console.log(
				`[Queue] Monitor ${m.idmonitor} agendado. Próximo check en ${m.cadacuantosegundos}s`,
			);
		}

		console.log(`${monitores.length} monitores cargados en la cola de REDIS.`);
	} catch (error) {
		console.error(
			"Se ha producido un error al cargar los monitores a REDIS: ",
			error,
		);
	}
};
