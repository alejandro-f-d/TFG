import { Queue } from "bullmq";
import IORedis from "ioredis";

import { QUEUE_MAIL } from "./constants.js";

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

export const addEmailToQueue = async (payload) => {
	try {
		const job = await mailQueue.add("send-email", payload);
		console.log(`[Queue-Mail] Trabajo ID ${job.id} enviado a Redis`);
		return job;
	} catch (err) {
		console.error("[Queue-Mail] Error:", err.message);
	}
};
