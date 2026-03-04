import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_MAIL, QUEUE_DOCUMENTS } from "./constants.js";

const connection = new IORedis(process.env.REDIS_URL, {
	maxRetriesPerRequest: null,
});

const defaultJobOptions = {
	attempts: 3,
	backoff: { type: "exponential", delay: 1000 },
	removeOnComplete: true,
	removeOnFail: { age: 24 * 3600 }, // Mantiene fallidos 24h para revisión
};

const mailQueue = new Queue(QUEUE_MAIL, { connection, defaultJobOptions });
const pdfQueue = new Queue(QUEUE_DOCUMENTS, { connection, defaultJobOptions });

export const addEmailToQueue = async (payload) => {
	try {
		const job = await mailQueue.add("send-email", payload);
		console.log(`[Queue-Mail] Trabajo ID ${job.id} enviado a Redis`);
		return job;
	} catch (err) {
		console.error("[Queue-Mail] Error:", err.message);
	}
};

export const addPdfToQueue = async (payload) => {
	try {
		// El nombre del trabajo ayuda a identificarlo en el dashboard de BullMQ
		const job = await pdfQueue.add("generate-server-access-pdf", payload);
		console.log(
			`[Queue-PDF] Trabajo ID ${job.id} enviado a Redis para: ${payload.nombreCompleto}`,
		);
		return job;
	} catch (err) {
		console.error("[Queue-PDF] Error al insertar en Redis:", err.message);
	}
};
