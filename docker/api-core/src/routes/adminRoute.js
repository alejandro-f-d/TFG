import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { serverAdapter } from "../controller/adminController.js";

const router = express.Router();

/**
 * @swagger
 * /admin/queues:
 *   get:
 *     summary: Interfaz de administración de colas (Bull Board)
 *     description: |
 *       Proporciona una interfaz gráfica para monitorear y gestionar las colas de tareas (BullMQ).
 *       Solo accesible para usuarios con permiso `admin:total`.
 *
 *       Este endpoint sirve una aplicación web interactiva, no una API REST.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: Token JWT con formato "Bearer <token>"
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Página HTML del dashboard de Bull Board
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html><html>..."
 *       401:
 *         description: No autorizado - Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No autorizado"
 *       403:
 *         description: Prohibido - No tiene permiso "admin:total"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: Ruta no encontrada (si se accede a una subruta inexistente dentro del dashboard)
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html><html><body>Not Found</body></html>"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor"
 */

// Aplicamos los middlewares a TODO el router del dashboard
router.use(
	"/",
	verificarToken,
	tienePermiso("admin:total"),
	serverAdapter.getRouter(),
);

export default router;
