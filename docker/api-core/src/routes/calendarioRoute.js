import express from "express";
import dotenv from "dotenv";
const router = express.Router();
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import {
	getAllEventosCalendario,
	getDetalleReserva,
	deleteReserva,
} from "../controller/calendarioController.js";

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

/**
 * @swagger
 * /api/reservas/{uuid}:
 *   get:
 *     summary: Obtiene el detalle de una reserva específica
 *     description: |
 *       Retorna la información detallada de una reserva del calendario.
 *       La reserva solo será visible si el usuario autenticado tiene permisos para verla
 *       (es el creador o tiene permisos administrativos).
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 *         description: UUID de la reserva a consultar
 *         example: "c486dd7d-22a5-4636-8c8f-b1dd516d2a9a"
 *     responses:
 *       200:
 *         description: Detalle de la reserva obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uuidcalendario:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único de la reserva
 *                   example: "c486dd7d-22a5-4636-8c8f-b1dd516d2a9a"
 *                 nombre_reserva:
 *                   type: string
 *                   description: Nombre o título de la reserva
 *                   example: "Pruebas de estrés GPU"
 *                 descripcion:
 *                   type: string
 *                   description: Descripción detallada de la reserva
 *                   example: "Análisis de temperatura bajo carga máxima"
 *                 fechainicio:
 *                   type: string
 *                   format: date-time
 *                   description: Fecha y hora de inicio de la reserva (ISO 8601)
 *                   example: "2026-03-10T00:00:00.000Z"
 *                 fechafin:
 *                   type: string
 *                   format: date-time
 *                   description: Fecha y hora de fin de la reserva (ISO 8601)
 *                   example: "2026-03-10T00:00:00.000Z"
 *                 nombre_maquina:
 *                   type: string
 *                   description: Nombre de la máquina reservada
 *                   example: "srv-gpu-01"
 *                 uuidmaquina:
 *                   type: string
 *                   format: uuid
 *                   description: UUID de la máquina reservada
 *                   example: "0e9d49a4-037f-4b0f-8c37-3f43cb51651e"
 *                 uuid_responsable:
 *                   type: string
 *                   format: uuid
 *                   description: UUID del usuario responsable/creador de la reserva
 *                   example: "2eede16d-a882-4907-91e1-c7260f50c7ab"
 *                 id_responsable:
 *                   type: integer
 *                   description: ID interno del usuario responsable
 *                   example: 1
 *                 nombre_completo_responsable:
 *                   type: string
 *                   description: Nombre completo del responsable
 *                   example: "Alejandro Fisac Delgado"
 *       400:
 *         description: Formato de UUID de reserva inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Formato de identificador de reserva inválido."
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
 *         description: Prohibido - No tiene permisos para ver la reserva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: |
 *           Reserva no encontrada o sin permisos para verla.
 *           El mismo mensaje se devuelve en ambos casos por seguridad.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Reserva no encontrada o no tienes permisos para verla."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Se ha producido un error interno al consultar la reserva."
 */

router.get("/:uuid", [verificarToken], getDetalleReserva);

/**
 * @swagger
 * /api/reservas/{uuid}:
 *   delete:
 *     summary: Elimina una reserva específica
 *     description: |
 *       Elimina una reserva del calendario.
 *       La reserva solo podrá ser eliminada si el usuario autenticado es el responsable
 *       de la misma o tiene permisos administrativos (la validación se realiza en la query DELETE_RESERVA_SEGURA).
 *       Esta operación es irreversible.
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 *         description: UUID de la reserva a eliminar
 *         example: "c486dd7d-22a5-4636-8c8f-b1dd516d2a9a"
 *     responses:
 *       204:
 *         description: Reserva eliminada correctamente (sin contenido)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva eliminada correctamente."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID de la reserva eliminada
 *                   example: "c486dd7d-22a5-4636-8c8f-b1dd516d2a9a"
 *       400:
 *         description: |
 *           Error de validación. Puede deberse a:
 *           * UUID no proporcionado
 *           * Formato de UUID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               uuidFaltante:
 *                 summary: UUID no proporcionado
 *                 value:
 *                   error: "Petición mal formada."
 *               uuidInvalido:
 *                 summary: Formato de UUID inválido
 *                 value:
 *                   error: "Formato de identificador de reserva inválido."
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
 *         description: Prohibido - No tiene permisos para eliminar la reserva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: |
 *           Reserva no encontrada o sin permisos para eliminarla.
 *           El mismo mensaje se devuelve en ambos casos por seguridad.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Reserva no encontrada o no tienes permisos para eliminarla."
 *       500:
 *         description: Error interno al intentar eliminar la reserva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno al intentar eliminar la reserva."
 */

router.delete("/:uuid", [verificarToken], deleteReserva);
export default router;
