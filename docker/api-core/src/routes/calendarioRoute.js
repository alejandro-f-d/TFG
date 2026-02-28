import express from "express";
import dotenv from "dotenv";
const router = express.Router();
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { getAllEventosCalendario } from "../controller/calendarioController.js";

/**
 * @swagger
 * /api/reservas:
 *   get:
 *     summary: Obtiene lista paginada de eventos del calendario
 *     description: |
 *       Retorna una lista paginada de eventos/reservas del calendario.
 *       Incluye información del usuario que realizó la reserva y la máquina asociada.
 *       Permite filtrar por nombre de la reserva.
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$'
 *         description: Token JWT con formato "Bearer <token>"
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página para paginación
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5
 *         description: Cantidad de eventos por página
 *         example: 10
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre de la reserva (búsqueda parcial)
 *         example: "IA"
 *     responses:
 *       200:
 *         description: Lista de eventos obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información de los eventos obtenida con éxito."
 *                 info:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     rows:
 *                       type: array
 *                       description: Array de eventos del calendario
 *                       items:
 *                         type: object
 *                         properties:
 *                           idcalendario:
 *                             type: integer
 *                             description: ID interno del evento
 *                             example: 1
 *                           uuidcalendario:
 *                             type: string
 *                             format: uuid
 *                             description: UUID único del evento
 *                             example: "ba7cc39d-1dc2-4090-acb2-592708f9bfcd"
 *                           nombre_reserva:
 *                             type: string
 *                             description: Nombre de la reserva
 *                             example: "Reserva IA"
 *                           descripcion:
 *                             type: string
 *                             description: Descripción de la reserva
 *                             example: "Reserva para pruebas GPU"
 *                           fechainicio:
 *                             type: string
 *                             format: date-time
 *                             description: Fecha y hora de inicio de la reserva (ISO 8601)
 *                             example: "2026-03-01T00:00:00.000Z"
 *                           fechafin:
 *                             type: string
 *                             format: date-time
 *                             description: Fecha y hora de fin de la reserva (ISO 8601)
 *                             example: "2026-03-05T00:00:00.000Z"
 *                           uuidusuario:
 *                             type: string
 *                             format: uuid
 *                             description: UUID del usuario que realizó la reserva
 *                             example: "9b5fe2b7-5f2a-4d9f-8585-3f0fca41e95d"
 *                           nombre_completo_usuario:
 *                             type: string
 *                             description: Nombre completo del usuario (nombre + apellidos)
 *                             example: "test test test"
 *                           nombre_maquina:
 *                             type: string
 *                             description: Nombre de la máquina reservada
 *                             example: "srv-gpu-01"
 *                           total_registros:
 *                             type: string
 *                             description: Número total de registros (para paginación)
 *                             example: "1"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                           description: Número total de eventos que coinciden con el filtro
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           description: Número total de páginas
 *                           example: 1
 *                         currentPage:
 *                           type: integer
 *                           description: Página actual
 *                           example: 1
 *                         pageSize:
 *                           type: integer
 *                           description: Tamaño de página (elementos por página)
 *                           example: 5
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       description: Número total de eventos que coinciden con el filtro
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       description: Número total de páginas
 *                       example: 1
 *                     currentPage:
 *                       type: integer
 *                       description: Página actual
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       description: Tamaño de página (elementos por página)
 *                       example: 5
 *       400:
 *         description: Parámetros de consulta inválidos (page/limit negativos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición invalida"
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
 *         description: Prohibido - No tiene el permiso requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: No se encontraron eventos con el filtro especificado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se han encontrado eventos que coincidan con: IA"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
 */

router.get(
	"/",
	[verificarToken, tienePermiso("calendar:getAllEventos")],
	getAllEventosCalendario,
);
export default router;
