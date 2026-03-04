import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Worker } from "bullmq";

import { redisConnection } from "./config/redis.js";
import { QUEUE_MAIL, QUEUE_DOCUMENTS } from "./constants.js";

import { mailProcessor } from "./core/mailProcessor.js"; // Tu lógica de Gmail
import { pdfProcessor } from "./core/pdfProcessor.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) =>
	res.send("MEDAL API Core - Sistema de Documentos y Mail Activo"),
);

const initWorker = (queueName, processor, concurrency = 5) => {
	const worker = new Worker(queueName, processor, {
		connection: redisConnection,
		concurrency: concurrency,
	});

	worker.on("ready", () => console.log(`Worker [${queueName}] escuchando...`));
	worker.on("completed", (job) =>
		console.log(`Job ${job.id} de ${queueName} finalizado`),
	);
	worker.on("failed", (job, err) =>
		console.error(`Job ${job.id} de ${queueName} falló: ${err.message}`),
	);

	return worker;
};

// Arrancamos los Workers
const mailWorker = initWorker(QUEUE_MAIL, mailProcessor, 5);
const pdfWorker = initWorker(QUEUE_DOCUMENTS, pdfProcessor, 2);

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`---------------------------------------------------`);
	console.log(`SERVIDOR CORE LISTO EN PUERTO: ${PORT}`);
	console.log(`SISTEMA DE GMAIL: ACTIVO`);
	console.log(`GENERACIÓN PDF LOCAL: ACTIVA`);
	console.log(`---------------------------------------------------`);
});
