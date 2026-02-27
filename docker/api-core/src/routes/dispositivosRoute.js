import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import {
	postDispositivo,
	getAllDispositivos,
	getDispositivoByUuid,
} from "../controller/dispositivosController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { dispositivoSchema } from "../schemas/index.js";

const router = express.Router();

/**
 * @swagger
 * /api/dispositivos:
 *   post:
 *     summary: Crea un nuevo dispositivo
 *     description: |
 *       Registra un dispositivo en el sistema.
 *       Se genera automáticamente un UUID único para el dispositivo.
 *       Los campos obligatorios son `nombre` e `idTipoDispositivo`.
 *     tags: [Dispositivos]
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
 *               - idTipoDispositivo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del dispositivo
 *                 example: "Disco SSD 1TB"
 *                 minLength: 1
 *               idTipoDispositivo:
 *                 type: integer
 *                 description: ID del tipo de dispositivo (clave foránea)
 *                 example: 3
 *               puntoMontaje:
 *                 type: string
 *                 description: Punto de montaje del dispositivo (ej. /dev/sda1)
 *                 example: "/dev/sda1"
 *               capacidad:
 *                 type: integer
 *                 description: Capacidad total del dispositivo (en GB)
 *                 example: 1024
 *               capacidadUsada:
 *                 type: integer
 *                 description: Capacidad utilizada del dispositivo (en GB)
 *                 example: 512
 *               tecnologia:
 *                 type: string
 *                 description: Tecnología del dispositivo (ej. SSD, HDD, NVMe)
 *                 example: "SSD"
 *               idMaquina:
 *                 type: integer
 *                 description: ID de la máquina a la que está asociado el dispositivo
 *                 example: 5
 *           examples:
 *             ejemploCompleto:
 *               summary: Dispositivo con todos los campos
 *               value:
 *                 nombre: "Disco NVMe 512GB"
 *                 idTipoDispositivo: 2
 *                 puntoMontaje: "/dev/nvme0n1"
 *                 capacidad: 512
 *                 capacidadUsada: 200
 *                 tecnologia: "NVMe"
 *                 idMaquina: 1
 *             ejemploMinimo:
 *               summary: Solo campos obligatorios
 *               value:
 *                 nombre: "Disco SSD 256GB"
 *                 idTipoDispositivo: 3
 *     responses:
 *       201:
 *         description: Dispositivo creado exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/dispositivos/123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dispositivo creado con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único del dispositivo creado
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://api.ejemplo.com/api/dispositivos/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación - Petición mal formada (faltan campos obligatorios o datos inválidos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan nombre o idTipoDispositivo
 *                 value:
 *                   error: "Petición mal formada"
 *               validacionJoi:
 *                 summary: Error de validación de esquema
 *                 value:
 *                   error: "nombre es requerido, idTipoDispositivo debe ser un número"
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
		tienePermiso("dispositivo:postDispositivo"),
		validarTipos(dispositivoSchema),
	],
	postDispositivo,
);

/**
 * @swagger
 * /api/dispositivos:
 *   get:
 *     summary: Obtiene lista paginada de dispositivos
 *     description: |
 *       Retorna una lista de dispositivos con paginación.
 *       Permite filtrar por nombre del dispositivo.
 *       Incluye información del tipo de dispositivo asociado.
 *     tags: [Dispositivos]
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
 *         description: Cantidad de dispositivos por página
 *         example: 10
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre del dispositivo (búsqueda parcial)
 *         example: "docker"
 *     responses:
 *       200:
 *         description: Listado de dispositivos obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Listado de dispositivos obtenido correctamente."
 *                 info:
 *                   type: array
 *                   description: Array de dispositivos con sus detalles
 *                   items:
 *                     type: object
 *                     properties:
 *                       iddispositivo:
 *                         type: integer
 *                         description: ID interno del dispositivo
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         description: Nombre del dispositivo
 *                         example: "Docker"
 *                       puntomontaje:
 *                         type: string
 *                         description: Punto de montaje del dispositivo
 *                         example: "/var/lib/docker"
 *                       capacidad:
 *                         type: integer
 *                         description: Capacidad total en GB
 *                         example: 1000
 *                       capacidadusada:
 *                         type: integer
 *                         description: Capacidad utilizada en GB
 *                         example: 450
 *                       tecnologia:
 *                         type: string
 *                         description: Tecnología del dispositivo
 *                         example: "NVMe"
 *                       uuiddispositivo:
 *                         type: string
 *                         format: uuid
 *                         description: UUID único del dispositivo
 *                         example: "f48686db-d50e-42f2-bbb8-3cca35683809"
 *                       idmaquina:
 *                         type: integer
 *                         description: ID de la máquina asociada
 *                         example: 1
 *                       idtipodispositivo:
 *                         type: integer
 *                         description: ID del tipo de dispositivo
 *                         example: 1
 *                       tipo_dispositivo_nombre:
 *                         type: string
 *                         description: Nombre del tipo de dispositivo
 *                         example: "SSD"
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
	[verificarToken, tienePermiso("dispositivo:getDispositivo")],
	getAllDispositivos,
);

/**
 * @swagger
 * /api/dispositivos/{uuid}:
 *   get:
 *     summary: Obtiene un dispositivo por su UUID
 *     description: |
 *       Retorna la información detallada de un dispositivo específico,
 *       incluyendo todos sus campos y el nombre del tipo de dispositivo asociado.
 *     tags: [Dispositivos]
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
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 *         description: UUID del dispositivo a consultar
 *         example: "7eb66568-620d-4212-b9cc-c15c04134b20"
 *     responses:
 *       200:
 *         description: Dispositivo encontrado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "dispositivo encontrado correctamente."
 *                 info:
 *                   type: object
 *                   properties:
 *                     iddispositivo:
 *                       type: integer
 *                       description: ID interno del dispositivo
 *                       example: 2
 *                     nombre:
 *                       type: string
 *                       description: Nombre del dispositivo
 *                       example: "ultradisk"
 *                     puntomontaje:
 *                       type: string
 *                       description: Punto de montaje del dispositivo
 *                       example: "/data"
 *                     capacidad:
 *                       type: integer
 *                       description: Capacidad total en GB
 *                       example: 4000
 *                     capacidadusada:
 *                       type: integer
 *                       description: Capacidad utilizada en GB
 *                       example: 1200
 *                     tecnologia:
 *                       type: string
 *                       description: Tecnología del dispositivo
 *                       example: "SATA"
 *                     uuiddispositivo:
 *                       type: string
 *                       format: uuid
 *                       description: UUID único del dispositivo
 *                       example: "7eb66568-620d-4212-b9cc-c15c04134b20"
 *                     idmaquina:
 *                       type: integer
 *                       description: ID de la máquina asociada
 *                       example: 2
 *                     idtipodispositivo:
 *                       type: integer
 *                       description: ID del tipo de dispositivo
 *                       example: 2
 *                     tipo_dispositivo_nombre:
 *                       type: string
 *                       description: Nombre del tipo de dispositivo
 *                       example: "HDD"
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
 *                   error: "Petición mal formada"
 *               uuidInvalido:
 *                 summary: Formato de UUID inválido
 *                 value:
 *                   error: "El formato del UUID proporcionado es inválido."
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
 *         description: Dispositivo no encontrado para el UUID proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se ha encontrado ningún dispositivo con el UUID: 7eb66568-620d-4212-b9cc-c15c04134b20"
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
	[verificarToken, tienePermiso("dispositivo:getDispositivo")],
	getDispositivoByUuid,
);

export default router;
