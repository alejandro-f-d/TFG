import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { postMonitor } from "../controller/monitorController.js";
import { monitorSchema } from "../schemas/index.js";
const router = express.Router();

/**
 * @swagger
 * /api/monitor:
 *   post:
 *     summary: Crea un nuevo monitor web
 *     description: |
 *       Registra un nuevo objetivo de monitoreo web.
 *       El monitor realizará peticiones periódicas a la dirección indicada
 *       y verificará que el código de respuesta HTTP sea el esperado.
 *     tags: [Monitoreo]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombreObjetivo
 *               - direccion
 *               - timeOutSegundos
 *               - idMetodo
 *               - cadaCuantoSegundos
 *             properties:
 *               nombreObjetivo:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Nombre descriptivo del objetivo a monitorear
 *                 example: "Servidor de producción"
 *               direccion:
 *                 type: string
 *                 format: uri
 *                 description: URL completa (http/https) del servicio a monitorear
 *                 example: "https://api.ejemplo.com/health"
 *               valorEsperado:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 599
 *                 default: 200
 *                 description: Código HTTP esperado (por defecto 200)
 *                 example: 200
 *               timeOutSegundos:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 30
 *                 description: Tiempo máximo de espera de respuesta en segundos
 *                 example: 5
 *               umbralReintentos:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 default: 3
 *                 description: Número de reintentos antes de marcar como fallo
 *                 example: 3
 *               idMetodo:
 *                 type: integer
 *                 description: ID del método HTTP (GET, POST, etc.) según tabla de métodos
 *                 example: 1
 *               cadaCuantoSegundos:
 *                 type: integer
 *                 minimum: 10
 *                 description: Intervalo entre monitoreos en segundos (mínimo 10)
 *                 example: 60
 *           examples:
 *             ejemploBasico:
 *               summary: Monitor básico
 *               value:
 *                 nombreObjetivo: "API Principal"
 *                 direccion: "https://miapi.com/status"
 *                 valorEsperado: 200
 *                 timeOutSegundos: 5
 *                 umbralReintentos: 2
 *                 idMetodo: 1
 *                 cadaCuantoSegundos: 30
 *     responses:
 *       201:
 *         description: Monitor creado exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL del recurso creado (UUID)
 *             example: "550e8400-e29b-41d4-a716-446655440000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proceso de monitoreo creado con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único del monitor creado
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso
 *                   example: "https://api.ejemplo.com/api/monitoreo/550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Error de validación (campos obligatorios faltantes o datos inválidos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan nombreObjetivo o direccion
 *                 value:
 *                   error: "Petición mal formada para la creación del monitoreo."
 *               validacionJoi:
 *                 summary: Error de validación de esquema
 *                 value:
 *                   error: "La dirección debe ser una URL válida (http/https)"
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
 *         description: Prohibido - No tiene el permiso "monitor:postMonitor"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
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

router.post(
	"/",
	[
		verificarToken,
		tienePermiso("monitor:postMonitor"),
		validarTipos(monitorSchema),
	],
	postMonitor,
);
export default router;
