import { Worker } from "bullmq";
import { redisConnection } from "./config/redis.js";
import { mailProcessor } from "./core/mailProcessor.js";
import { QUEUE_MAIL } from "./constants.js";

const worker = new Worker(QUEUE_MAIL, mailProcessor, {
	connection: redisConnection,
	concurrency: 5,
});

worker.on("ready", () => {
	console.log(`Worker escuchando en la cola: ${QUEUE_MAIL}`);
});

worker.on("completed", (job) => {
	console.log(`Trabajo ${job.id} finalizado correctamente`);
});

worker.on("failed", (job, err) => {
	console.error(`Trabajo ${job.id} falló: ${err.message}`);
});
