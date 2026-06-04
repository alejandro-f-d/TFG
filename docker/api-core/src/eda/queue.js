import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
	QUEUE_MAIL,
	QUEUE_DOCUMENTS,
	QUEUE_HEALTH,
	QUEUE_GITLAB,
} from "./constants.js";

const connection = new IORedis(process.env.REDIS_URL, {
	maxRetriesPerRequest: null,
});

const defaultJobOptions = {
	attempts: 3,
	backoff: { type: "exponential", delay: 1000 },
	removeOnComplete: { count: 100 }, // Mantiene los últimos 100 trabajos completados, para poder verlos en el gestor.
	removeOnFail: { age: 7 * 24 * 3600 }, // Mantiene fallidos 7 días para revisión
};

const mailQueue = new Queue(QUEUE_MAIL, { connection, defaultJobOptions });
const pdfQueue = new Queue(QUEUE_DOCUMENTS, { connection, defaultJobOptions });
const monitorQueue = new Queue(QUEUE_HEALTH, { connection, defaultJobOptions });
const gitlabQueue = new Queue(QUEUE_GITLAB, { connection, defaultJobOptions });

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
		const job = await pdfQueue.add("generate-server-access-pdf", payload);
		console.log(
			`[Queue-PDF] Trabajo ID ${job.id} enviado a Redis para: ${payload.nombreCompleto}`,
		);
		return job;
	} catch (err) {
		console.error("[Queue-PDF] Error al insertar en Redis:", err.message);
	}
};

export const addMonitorToQueue = async (payload) => {
	try {
		const job = await monitorQueue.add(
			"check-health",
			{
				idMonitor: payload.idmonitor,
				direccion: payload.direccion,
				valorEsperado: payload.valoresperado,
				timeoutSegundos: payload.timeoutsegundos,
				// Mapeamos el tipo según el ID que venga del frontend o DB
				type: payload.idmetodo === 1 ? "GET" : "PING",
			},
			{
				repeat: {
					every: payload.cadacuantosegundos * 1000,
				},
				jobId: payload.uuidmonitoreo, // Evita que se duplique si hay reintentos
			},
		);

		console.log(
			`[Queue-Health] Nuevo monitor registrado: ${payload.nombreobjetivo} (ID: ${job.id})`,
		);
		return job;
	} catch (error) {
		console.error(
			"[Queue-Health] Error al insertar monitor en Redis:",
			error.message,
		);
		throw error;
	}
};

export const addGitlabQueue = async () => {
	try {
		const job = await gitlabQueue.add("recargar-gitlab", {});

		console.log(
			`[Queue-Gitlab] Trabajo ID ${job.id} enviado a Redis debido a un nuevo id.`,
		);
		return job;
	} catch (error) {
		console.error("Se ha producido un error con el REDIS de gitlab. ", error);
	}
};

export const queuesForDashboard = [
	mailQueue,
	pdfQueue,
	monitorQueue,
	gitlabQueue,
];
