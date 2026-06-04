import express from "express";
import dotenv from "dotenv";

import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
const router = express.Router();

import {
	postPuerta,
	getPuertas,
	getPuertasByUuid,
	deletePuertaByUuid,
} from "../controller/puertasController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { puertaSchema } from "../schemas/index.js";

/**
 * @swagger
 * /api/puertas:
 *   post:
 *     summary: Crea una nueva puerta
 *     description: |
 *       Registra una nueva puerta en el sistema.
 *       Se genera automáticamente un UUID único para la puerta.
 *     tags: [Puertas]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - ubicacion
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre descriptivo de la puerta
 *                 example: "Puerta Principal"
 *                 minLength: 1
 *                 maxLength: 255
 *               ubicacion:
 *                 type: string
 *                 description: Ubicación física de la puerta
 *                 example: "Edificio A, Planta 1"
 *                 minLength: 1
 *                 maxLength: 255
 *           examples:
 *             ejemploBasico:
 *               summary: Ejemplo de creación de puerta
 *               value:
 *                 nombre: "Acceso Servidores"
 *                 ubicacion: "Sala de servidores, rack 3"
 *     responses:
 *       201:
 *         description: Puerta creada exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/puertas/123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Puerta creada con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único de la puerta creada
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://api.ejemplo.com/api/puertas/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación - Petición mal formada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan campos requeridos
 *                 value:
 *                   error: "Petición mal formada."
 *               validacionJoi:
 *                 summary: Error de validación de Joi
 *                 value:
 *                   error: "nombre es requerido, ubicacion debe ser una cadena"
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

router.post(
	"/",
	[
		verificarToken,
		tienePermiso("puertas:postPuerta"),
		validarTipos(puertaSchema),
	],
	postPuerta,
);

/**
 * @swagger
 * /api/puertas:
 *   get:
 *     summary: Obtiene lista paginada de puertas
 *     description: |
 *       Retorna una lista de puertas con paginación.
 *       Permite filtrar por nombre de la puerta.
 *       Cada puerta incluye un array de usuarios autorizados.
 *     tags: [Puertas]
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
 *         description: Cantidad de puertas por página
 *         example: 10
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre de la puerta (búsqueda parcial)
 *         example: "CPD"
 *     responses:
 *       200:
 *         description: Listado de puertas obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Listado de las puertas obtenido correctamente."
 *                 info:
 *                   type: array
 *                   description: Array de puertas con sus usuarios autorizados
 *                   items:
 *                     type: object
 *                     properties:
 *                       idpuerta:
 *                         type: integer
 *                         description: ID interno de la puerta
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         description: Nombre de la puerta
 *                         example: "Puerta CPD"
 *                       ubicacion:
 *                         type: string
 *                         description: Ubicación de la puerta
 *                         example: "Edificio A - Planta Baja"
 *                       uuidpuerta:
 *                         type: string
 *                         format: uuid
 *                         description: UUID único de la puerta
 *                         example: "74bb89e3-7d8b-4626-a86d-c16db78b4a02"
 *                       usuarios_autorizados:
 *                         type: array
 *                         description: Lista de usuarios con acceso autorizado a la puerta
 *                         items:
 *                           type: object
 *                           properties:
 *                             uuid:
 *                               type: string
 *                               format: uuid
 *                               description: UUID del usuario
 *                               example: "8141c291-dd92-437a-92c7-84a8842dbf59"
 *                             nombre:
 *                               type: string
 *                               description: Nombre del usuario
 *                               example: "Alejandro"
 *                             apellidos:
 *                               type: string
 *                               description: Apellidos completos del usuario
 *                               example: "Fisac Delgado"
 *                         example: [
 *                           {
 *                             "uuid": "8141c291-dd92-437a-92c7-84a8842dbf59",
 *                             "nombre": "test",
 *                             "apellidos": "test test"
 *                           },
 *                           {
 *                             "uuid": "7e4c001b-3e99-48c3-b56e-f08afaa17908",
 *                             "nombre": "Alejandro",
 *                             "apellidos": "Fisac Delgado"
 *                           }
 *                         ]
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

router.get(
	"/",
	[verificarToken, tienePermiso("puertas:getPuertas")],
	getPuertas,
);

/**
 * @swagger
 * /api/puertas/{uuid}:
 *   get:
 *     summary: Obtiene una puerta por su UUID
 *     description: |
 *       Retorna la información detallada de una puerta específica,
 *       incluyendo la lista de usuarios autorizados.
 *     tags: [Puertas]
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
 *         description: UUID de la puerta a consultar
 *         example: "4474583b-9c63-4484-b728-0dfefb2f0b72"
 *     responses:
 *       200:
 *         description: Puerta encontrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Puerta encontrada con éxito"
 *                 info:
 *                   type: object
 *                   properties:
 *                     idpuerta:
 *                       type: integer
 *                       description: ID interno de la puerta
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       description: Nombre de la puerta
 *                       example: "Puerta CPD"
 *                     ubicacion:
 *                       type: string
 *                       description: Ubicación de la puerta
 *                       example: "Edificio A - Planta Baja"
 *                     uuidpuerta:
 *                       type: string
 *                       format: uuid
 *                       description: UUID único de la puerta
 *                       example: "4474583b-9c63-4484-b728-0dfefb2f0b72"
 *                     usuarios_autorizados:
 *                       type: array
 *                       description: Lista de usuarios con acceso autorizado a la puerta
 *                       items:
 *                         type: object
 *                         properties:
 *                           uuid:
 *                             type: string
 *                             format: uuid
 *                             description: UUID del usuario
 *                             example: "0254d39d-be01-4873-8d40-e601ddd65bba"
 *                           nombre:
 *                             type: string
 *                             description: Nombre del usuario
 *                             example: "Alejandro"
 *                           apellidos:
 *                             type: string
 *                             description: Apellidos completos del usuario
 *                             example: "Fisac Delgado"
 *                       example: [
 *                         {
 *                           "uuid": "0254d39d-be01-4873-8d40-e601ddd65bba",
 *                           "nombre": "Alejandro",
 *                           "apellidos": "Fisac Delgado"
 *                         },
 *                         {
 *                           "uuid": "5a6a5bd5-320a-4ded-bc6d-b2c7a8045a71",
 *                           "nombre": "test",
 *                           "apellidos": "test test"
 *                         }
 *                       ]
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
 *         description: |
 *           Puerta no encontrada. Puede deberse a:
 *           * Formato de UUID inválido
 *           * UUID no existente en la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               formatoInvalido:
 *                 summary: UUID con formato incorrecto
 *                 value:
 *                   error: "Máquina no encontrada (Formato de ID inválido)."
 *               noExiste:
 *                 summary: UUID válido pero no existe
 *                 value:
 *                   error: "Puerta no encontrada."
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
	"/:uuid",
	[verificarToken, tienePermiso("puertas:getPuertas")],
	getPuertasByUuid,
);

/**
 * @swagger
 * /api/puertas/{uuid}:
 *   delete:
 *     summary: Elimina una puerta por su UUID
 *     description: |
 *       Elimina una puerta específica del sistema. Esta operación es irreversible.
 *       Antes de eliminar la puerta, se eliminan automáticamente todas las relaciones
 *       con usuarios autorizados (tabla intermedia) para mantener la integridad referencial.
 *     tags: [Puertas]
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
 *         description: UUID de la puerta a eliminar
 *         example: "4474583b-9c63-4484-b728-0dfefb2f0b72"
 *     responses:
 *       204:
 *         description: Puerta eliminada exitosamente (sin contenido)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Puerta borrada con éxito."
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
 *         description: |
 *           Puerta no encontrada. Puede deberse a:
 *           * Formato de UUID inválido
 *           * UUID no existente en la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               formatoInvalido:
 *                 summary: UUID con formato incorrecto
 *                 value:
 *                   error: "Máquina no encontrada (Formato de ID inválido)."
 *               noExiste:
 *                 summary: UUID válido pero no existe
 *                 value:
 *                   error: "Puerta no encontrada."
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

router.delete(
	"/:uuid",
	[verificarToken, tienePermiso("puertas:deletePuerta")],
	deletePuertaByUuid,
);

export default router;
