import express from "express";
import dotenv from "dotenv";
import { getStatus } from "../controller/healthController.js";

const router = express.Router();

/**
 * @swagger
 * /api/healthcheck:
 *   get:
 *     summary: Verifica el estado de los servicios del sistema
 *     description: |
 *       Endpoint de health check que verifica el estado de los componentes críticos del sistema:
 *       - Base de datos PostgreSQL
 *       - Conexión con Redis
 *       - Servicio de correo (Google SMTP)
 *
 *       Retorna 200 OK si todos los servicios están funcionando correctamente.
 *       Retorna 503 Service Unavailable si alguno de los servicios críticos está caído.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Todos los servicios funcionan correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [OK]
 *                   example: "OK"
 *                 service:
 *                   type: string
 *                   description: Nombre del servicio
 *                   example: "api-medal"
 *                 uptime:
 *                   type: string
 *                   description: Tiempo de actividad del servidor en segundos
 *                   example: "3600s"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Marca de tiempo de la verificación
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 components:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP]
 *                           example: "UP"
 *                         latency:
 *                           type: string
 *                           description: Tiempo de respuesta de la base de datos
 *                           example: "5ms"
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP]
 *                           example: "UP"
 *                         latency:
 *                           type: string
 *                           description: Tiempo de respuesta de Redis
 *                           example: "2ms"
 *                     google_api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP]
 *                           example: "UP"
 *                         latency:
 *                           type: string
 *                           description: Tiempo de verificación del servicio SMTP
 *                           example: "150ms"
 *       503:
 *         description: Uno o más servicios críticos están caídos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ERROR]
 *                   example: "ERROR"
 *                 service:
 *                   type: string
 *                   example: "api-medal"
 *                 uptime:
 *                   type: string
 *                   example: "3600s"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 components:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP, DOWN]
 *                           example: "DOWN"
 *                         error:
 *                           type: string
 *                           description: Mensaje de error detallado
 *                           example: "Connection refused"
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP, DOWN]
 *                           example: "UP"
 *                         latency:
 *                           type: string
 *                           example: "2ms"
 *                     google_api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [UP, DOWN]
 *                           example: "DOWN"
 *                         error:
 *                           type: string
 *                           example: "Invalid login credentials"
 *             examples:
 *               dbDown:
 *                 summary: Base de datos caída
 *                 value:
 *                   status: "ERROR"
 *                   service: "api-medal"
 *                   uptime: "3600s"
 *                   timestamp: "2024-01-15T10:30:00.000Z"
 *                   components:
 *                     database:
 *                       status: "DOWN"
 *                       error: "Connection refused"
 *                     redis:
 *                       status: "UP"
 *                       latency: "2ms"
 *                     google_api:
 *                       status: "UP"
 *                       latency: "150ms"
 *               multipleDown:
 *                 summary: Múltiples servicios caídos
 *                 value:
 *                   status: "ERROR"
 *                   service: "api-medal"
 *                   uptime: "3600s"
 *                   timestamp: "2024-01-15T10:30:00.000Z"
 *                   components:
 *                     database:
 *                       status: "DOWN"
 *                       error: "Connection refused"
 *                     redis:
 *                       status: "DOWN"
 *                       error: "ECONNREFUSED 127.0.0.1:6379"
 *                     google_api:
 *                       status: "UP"
 *                       latency: "150ms"
 */

router.get("/", getStatus);
export default router;
