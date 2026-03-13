import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import {
	postMonitor,
	getMonitorByUuid,
	deleteMonitor,
} from "../controller/monitorController.js";
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

/**
 * @swagger
 * /api/monitoreo/{uuid}:
 *   get:
 *     summary: Obtiene los detalles de un monitor por su UUID
 *     description: |
 *       Retorna la información detallada de un monitor específico, incluyendo
 *       datos de configuración, última respuesta, responsable y método HTTP.
 *
 *       **Control de acceso:**
 *       - Requiere permiso `monitor:listar` o `admin:total`
 *       - El propietario del monitor también puede acceder aunque no tenga esos permisos
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del monitor a consultar
 *         example: "55e7434f-6f33-483d-9485-d8580ecf8e53"
 *     responses:
 *       200:
 *         description: Monitor encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Monitor encontrado con éxito"
 *                 info:
 *                   type: object
 *                   properties:
 *                     uuidmonitoreo:
 *                       type: string
 *                       format: uuid
 *                       description: UUID único del monitor
 *                       example: "55e7434f-6f33-483d-9485-d8580ecf8e53"
 *                     nombreobjetivo:
 *                       type: string
 *                       description: Nombre descriptivo del objetivo
 *                       example: "Prueba del servidor"
 *                     direccion:
 *                       type: string
 *                       format: uri
 *                       description: URL monitoreada
 *                       example: "https://localhost:8080/healthchek"
 *                     valorultimarespuesta:
 *                       type: integer
 *                       nullable: true
 *                       description: Último código de respuesta HTTP obtenido (puede ser nulo si aún no se ha ejecutado)
 *                       example: null
 *                     valoresperado:
 *                       type: integer
 *                       description: Código HTTP esperado
 *                       example: 200
 *                     contadorfallos:
 *                       type: integer
 *                       description: Número de fallos consecutivos
 *                       example: 0
 *                     timeoutsegundos:
 *                       type: integer
 *                       description: Tiempo máximo de espera en segundos
 *                       example: 1
 *                     cadacuantosegundos:
 *                       type: integer
 *                       description: Intervalo entre monitoreos (segundos)
 *                       example: 10
 *                     fechaverificacion:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Fecha de la última verificación realizada
 *                       example: null
 *                     proxima_ejecucion:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha y hora programada para la próxima ejecución
 *                       example: "2026-03-13T13:18:30.896Z"
 *                     responsable_nombre:
 *                       type: string
 *                       description: Nombre completo del usuario responsable/creador
 *                       example: "Alejandro Fisac Delgado"
 *                     responsable_email:
 *                       type: string
 *                       format: email
 *                       description: Correo electrónico del responsable
 *                       example: "alejandro.fisac.contact@gmail.com"
 *                     metodo_http:
 *                       type: string
 *                       description: Descripción del método HTTP utilizado (ej. GET, POST, ICMP)
 *                       example: "ICMP Echo (Ping Red)"
 *                     ultimo_estado_disponible:
 *                       type: boolean
 *                       nullable: true
 *                       description: Último estado de disponibilidad (true = disponible)
 *                       example: null
 *                     ultimo_codigo_http:
 *                       type: integer
 *                       nullable: true
 *                       description: Último código HTTP obtenido (puede ser nulo)
 *                       example: null
 *                     ultima_respuesta_fecha:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Fecha de la última respuesta recibida
 *                       example: null
 *       400:
 *         description: Petición mal formada (UUID no proporcionado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición mal formada."
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
 *         description: No tiene permisos para ver este monitor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes acceso a ese monitor."
 *       404:
 *         description: Monitor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Monitor no encontrado."
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

router.get("/:uuid", [verificarToken], getMonitorByUuid);

/**
 * @swagger
 * /api/monitoreo/{uuid}:
 *   delete:
 *     summary: Elimina un monitor por su UUID
 *     description: |
 *       Elimina permanentemente un monitor de la base de datos.
 *
 *       **Control de acceso:**
 *       - Requiere permiso `monitor:borrar` o `admin:total`
 *       - El propietario del monitor también puede eliminarlo aunque no tenga esos permisos
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del monitor a eliminar
 *         example: "55e7434f-6f33-483d-9485-d8580ecf8e53"
 *     responses:
 *       204:
 *         description: Monitor eliminado correctamente (sin contenido)
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
 *                 value:
 *                   error: "Petición mal formada."
 *               uuidInvalido:
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
 *         description: No tiene permisos para eliminar este monitor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes acceso a ese monitor."
 *       404:
 *         description: Monitor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Monitor not found."
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
router.delete("/:uuid", [verificarToken], deleteMonitor);
export default router;
