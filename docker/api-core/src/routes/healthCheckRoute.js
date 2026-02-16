import express from "express";
import dotenv from "dotenv";
import { getStatus } from "../controller/healthController.js"


const router = express.Router();

/**
 * @swagger
 * /api/healthCheck:
 *   get:
 *     summary: Verificación del estado del servicio.
 *     description: Retorna el estado del servicio, la base de datos, el uptime y un timestamp del sistema.
 *     tags:
 *       - HealthCheck
 *     responses:
 *       200:
 *         description: Respuesta exitosa con el estado del sistema.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: "api-medal"
 *                 uptime:
 *                   type: number
 *                   description: Tiempo que el servicio ha estado activo (en segundos).
 *                   example: 252.278315282
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "UP"
 *                     latency:
 *                       type: string
 *                       example: "38ms"
 *                     connection:
 *                       type: string
 *                       example: "PostgreSQL OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-02-15T20:36:44.850Z"
 *       500:
 *         description: Error interno del servidor.
 */
router.get("/", getStatus);
export default router;
