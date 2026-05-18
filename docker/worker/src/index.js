import crypto from "node:crypto";
globalThis.crypto = crypto;
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Worker } from "bullmq";
import { initCron } from "./cron/cron.js";

import { redisConnection } from "./config/redis.js";
import { QUEUE_MAIL, QUEUE_DOCUMENTS, QUEUE_HEALTH } from "./constants.js";

import { mailProcessor } from "./core/mailProcessor.js"; // Tu lógica de Gmail
import { pdfProcessor } from "./core/pdfProcessor.js";
import { healthProcessor } from "./core/healthProcessor.js";
import { loadMonitorsToRedis } from "./eda/queue.js";
import { runGitlabSync } from "./core/gitlabProcessor.js";

import BaseDeDatos from "./bbdd/conexion.js";

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
// const mailWorker = initWorker(QUEUE_MAIL, mailProcessor, 5);
// const pdfWorker = initWorker(QUEUE_DOCUMENTS, pdfProcessor, 2);

const startSystem = async () => {
	try {
		console.log("---------------------------------------------------");
		console.log("Verificando base de datos");

		await BaseDeDatos.query("SELECT NOW()");
		console.log("DB POSTGRESQL: CONECTADA");
		initWorker(QUEUE_MAIL, mailProcessor, 5);
		initWorker(QUEUE_DOCUMENTS, pdfProcessor, 2);
		initWorker(QUEUE_HEALTH, healthProcessor, 10);
		const PORT = process.env.PORT || 3000;
		initCron();
		await loadMonitorsToRedis();
		await runGitlabSync();
		app.listen(PORT, () => {
			console.log(`SERVIDOR WORKER EN: ${PORT}`);
			console.log(`SISTEMA DE GMAIL: ACTIVO`);
			console.log(`GENERACIÓN PDF: ACTIVA`);
			console.log(`Cron iniciado correctamente.`);
			console.log(`Monitoreo cargado correctamente.`);
			console.log("---------------------------------------------------");
		});
	} catch (error) {
		console.error("---------------------------------------------------");
		console.error("ERROR:");
		console.error(error.message);
		console.log("---------------------------------------------------");
	}
};

process.on("SIGTERM", async () => {
	console.log("Cerrando Workers y conexiones...");
	await BaseDeDatos.cerrarConexion();
	process.exit(0);
});

startSystem();
