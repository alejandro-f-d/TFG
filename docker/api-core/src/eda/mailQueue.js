import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_MAIL } from "./constants.js";
const connection = new IORedis(process.env.REDIS_URL, {
	maxRetriesPerRequest: null,
});

// 2. Definimos la cola usando esa conexión
const mailQueue = new Queue(QUEUE_MAIL, {
	connection,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: "exponential", delay: 1000 },
	},
});

export const addEmailToQueue = async (payload) => {
	try {
		const job = await mailQueue.add("send-email", payload, {
			removeOnComplete: true,
			removeOnFail: { age: 24 * 3600 },
		});
		console.log(`[Queue] Trabajo ID ${job.id} enviado a Redis`);
		return job;
	} catch (err) {
		console.error("[Queue] Error al insertar en Redis:", err.message);
	}
};
