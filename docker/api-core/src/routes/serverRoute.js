import express from "express";
import dotenv from "dotenv";
import {
	postMaquina,
	getMaquinas,
	getMaquina,
	deleteMaquina,
	getServiciosPorMaquina,
	patchServer,
} from "../controller/serverController.js";
import {
	postServicios,
	getServicioByUuid,
	deleteServicioByUuid,
	patchServicio,
} from "../controller/serviciosController.js";
import {
	postCalendario,
	getReservasMaquina,
} from "../controller/calendarioController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
const router = express.Router();

import { validarTipos } from "../middlewares/validador.middleware.js";
import {
	maquinaSchema,
	maquinaPatchSchema,
	servicioSchema,
	servicioPatchSchema,
	reservaSchema,
} from "../schemas/index.js";

/**
 * @swagger
 * /api/maquina:
 *   post:
 *     summary: Crear un nuevo servidor
 *     tags: [Máquina]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - red
 *               - especificaciones
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: athenea
 *               caducidadSsl:
 *                 type: string
 *                 format: date
 *                 example: 2026-12-31
 *               certificadoSslActivo:
 *                 type: boolean
 *                 example: true
 *               emisorSsl:
 *                 type: string
 *                 example: Let's Encrypt
 *               red:
 *                 type: object
 *                 required:
 *                   - direccionIpPrivadaV4
 *                   - puertaEnlaceV4
 *                 properties:
 *                   direccionIpPrivadaV4:
 *                     type: string
 *                     format: ipv4
 *                     example: 10.0.0.5
 *                   direccionIpPublicaV4:
 *                     type: string
 *                     format: ipv4
 *                     example: 80.24.152.10
 *                   direccionIpPrivadaV6:
 *                     type: string
 *                     format: ipv6
 *                     example: fd00::1
 *                   direccionIpPublicaV6:
 *                     type: string
 *                     format: ipv6
 *                     example: 2001:db8::1
 *                   puertaEnlaceV4:
 *                     type: string
 *                     format: ipv4
 *                     example: 10.0.0.1
 *                   puertaEnlaceV6:
 *                     type: string
 *                     format: ipv6
 *                     example: fe80::1
 *               especificaciones:
 *                 type: object
 *                 required:
 *                   - sistemaOperativo
 *                 properties:
 *                   sistemaOperativo:
 *                     type: string
 *                     example: Ubuntu 24.04 LTS
 *                   ram:
 *                     type: integer
 *                     description: Memoria RAM en GB
 *                     example: 32
 *                   esServidor:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       201:
 *         description: Servidor creado correctamente
 *       400:
 *         description: Faltan parámetros obligatorios
 *       403:
 *         description: Careces de los permisos necesarios.
 *       500:
 *         description: Error interno del servidor
 */
router.post(
	"/",
	[
		verificarToken,
		tienePermiso("maq:postMaquina"),
		validarTipos(maquinaSchema),
	],
	postMaquina,
);

/**
 * @swagger
 * /api/maquina/:
 *   get:
 *     summary: Dependiendo de tus permisos obtienes un listado de todas las máquinas o solo de los servidores.
 *     tags: [Máquina]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Número de página para paginación.
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Número de registros por página.
 *         schema:
 *           type: integer
 *           example: 10
 *       - name: filtroNombre
 *         in: query
 *         required: false
 *         description: Filtra las máquinas por nombre (búsqueda parcial).
 *         schema:
 *           type: string
 *           example: athenea
 *     responses:
 *       200:
 *         description: Devuelve el listado correspondiente.
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Máquina o servicio no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *
 */
router.get("/", verificarToken, getMaquinas);

/**
 * @swagger
 * /api/maquina/{uuid}:
 *   get:
 *     summary: Obtienes una máquina por uuid.
 *     tags: [Máquina]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la máquina
 *         example: 178529fe-3c6b-4a50-b318-9d9f01ae0054
 *     responses:
 *       200:
 *         description: Información del máquina encontrada correctamente.
 *       400:
 *         description: Error en los datos enviados.
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Máquina no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

router.get("/:uuid", verificarToken, getMaquina);

/**
 * @swagger
 * /api/maquina/{uuid}:
 *   patch:
 *     summary: Actualiza parcialmente una máquina.
 *     tags: [Máquina]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la máquina.

 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               nombre: "Athenea Modificado"
 *     responses:
 *       204:
 *         description: Actualizado con éxito.
 *       403:
 *         description: Careces de los permisos necesarios. 
 *       404:
 *         description: Máquina no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */

router.patch(
	"/:uuid",
	[
		verificarToken,
		tienePermiso("maq:editServer"),
		validarTipos(maquinaPatchSchema),
	],
	patchServer,
);

/**
 * @swagger
 * /api/maquina/{uuid}:
 *   delete:
 *     summary: Elimina una máquina por su UUID.
 *     tags: [Máquina]
 *     parameters:
 *       - name: uuid
 *         in: path
 *         required: true
 *         description: UUID de la máquina que se desea eliminar.
 *         schema:
 *           type: string
 *           example: 65f2a9c8-d123-4abc-5678-ef9012345678
 *     responses:
 *       204:
 *         description: Máquina eliminada correctamente.
 *       403:
 *         description: No tienes permisos suficientes.
 *       404:
 *         description: Máquina no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */

router.delete(
	"/:uuid",
	[verificarToken, tienePermiso("maq:deleteServer")],
	deleteMaquina,
);

/**
 * @swagger
 * /api/maquina/:uuid/servicios:
 *   get:
 *     summary: Obtienes lo servicios asociados a una máquina.
 *     tags: [Servicios]
 *     parameters:
 *       - name: uuid
 *         in: path
 *         required: true
 *         description: UUID de la máquina que se desea ver los servicios.
 *       - name: page
 *         in: query
 *         required: false
 *         description: Número de página para paginación.
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Número de registros por página.
 *         schema:
 *           type: integer
 *           example: 10
 *       - name: filtroNombre
 *         in: query
 *         required: false
 *         description: Filtra las máquinas por nombre (búsqueda parcial).
 *         schema:
 *           type: string
 *           example: athenea
 *     responses:
 *       200:
 *         description: Devuelve el listado correspondiente.
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Máquina o servicio no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *
 */

router.get(
	"/:uuid/servicios",
	[verificarToken, tienePermiso("maquina:verServicios", true)],
	getServiciosPorMaquina,
);

/**
 * @swagger
 * /api/maquina/{uuid}/servicios:
 *   post:
 *     summary: Crear un nuevo servicio asociado a una máquina
 *     tags:
 *       - Servicios
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la máquina
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombreServicio
 *               - idUsuario
 *               - idPeticion
 *             properties:
 *               nombreServicio:
 *                 type: string
 *                 example: Servidor Web de Pruebas
 *               descripcionTecnica:
 *                 type: string
 *                 example: Instancia de Apache para el despliegue del microservicio de auditoría.
 *               entorno:
 *                 type: string
 *                 enum: [Desarrollo, QA, Produccion]
 *                 example: Desarrollo
 *               publico:
 *                 type: boolean
 *                 example: true
 *               softwareBase:
 *                 type: string
 *                 example: Apache/2.4.41 (Ubuntu)
 *               activo:
 *                 type: boolean
 *                 example: true
 *               nivelSeveridad:
 *                 type: string
 *                 enum: [bajo, medio, alto, critico]
 *                 example: bajo
 *               idUsuario:
 *                 type: integer
 *                 example: 1
 *               idPeticion:
 *                 type: integer
 *                 example: 1
 *               servidores:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *               puertosAbiertos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     numeroPuertoMaquina:
 *                       type: integer
 *                       example: 80
 *                     protocolo:
 *                       type: string
 *                       example: TCP
 *                     nombreServicio:
 *                       type: string
 *                       example: HTTP
 *                     puertoVirtual:
 *                       type: integer
 *                       example: 8080
 *     responses:
 *       201:
 *         description: Servicio creado correctamente
 *       400:
 *         description: Petición mal formada
 *       403:
 *         description: Usuario no autorizado
 *       404:
 *         description: Máquina no encontrada
 *       500:
 *         description: Error interno del servidor
 */

router.post(
	"/:uuid/servicios",
	[
		verificarToken,
		tienePermiso("maquina:crearServicios", true),
		validarTipos(servicioSchema),
	],
	postServicios,
);

/**
 * @swagger
 * /api/maquinas/{uuid}/servicios/{uuidServicio}:
 *   get:
 *     summary: Obtener un servicio por UUID asociado a una máquina
 *     description: Retorna la información de un servicio específico perteneciente a una máquina.
 *     tags:
 *       - Servicios
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la máquina
 *       - in: path
 *         name: uuidServicio
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del servicio
 *     responses:
 *       200:
 *         description: Servicio encontrado correctamente y retorno de la información asociada.
 *       401:
 *         description: Token no valido o ausente.
 *       403:
 *         description: Carece de los permisos necesarios.
 *       404:
 *         description: Servicio no encontrado
 *       500:
 *         description: Error interno del servidor
 */

router.get(
	"/:uuid/servicios/:uuidServicio",
	[verificarToken, tienePermiso("maquina:verServicios", true)],
	getServicioByUuid,
);

/**
 * @swagger
 * /api/maquinas/{uuid}/servicios/{uuidServicio}:
 *   patch:
 *     summary: Actualiza parcialmente un servicio de una máquina
 *     tags: [Servicios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 *         description: UUID de la máquina
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: uuidServicio
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 *         description: UUID del servicio a actualizar
 *         example: "123e4567-e89b-12d3-a456-426614174001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreServicio:
 *                 type: string
 *                 description: Nombre del servicio
 *                 example: "Apache Web Server"
 *               descripcionTecnica:
 *                 type: string
 *                 description: Descripción técnica del servicio
 *                 example: "Servidor web Apache versión 2.4"
 *               entorno:
 *                 type: string
 *                 enum: [produccion, desarrollo, testing]
 *                 description: Entorno donde se ejecuta el servicio
 *                 example: "produccion"
 *               publico:
 *                 type: boolean
 *                 description: Indica si el servicio es público
 *                 example: true
 *               softwareBase:
 *                 type: string
 *                 description: Software base del servicio
 *                 example: "Apache 2.4"
 *               activo:
 *                 type: boolean
 *                 description: Estado del servicio
 *                 example: true
 *               nivelSeveridad:
 *                 type: string
 *                 enum: [bajo, medio, alto, critico]
 *                 description: Nivel de severidad del servicio
 *                 example: "alto"
 *               servidores:
 *                 type: array
 *                 description: IDs de los servidores asociados
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *               puertosAbiertos:
 *                 type: array
 *                 description: Puertos abiertos del servicio
 *                 items:
 *                   type: object
 *                   properties:
 *                     numeroPuertoMaquina:
 *                       type: integer
 *                       description: Número de puerto en la máquina
 *                       example: 80
 *                     protocolo:
 *                       type: string
 *                       enum: [TCP, UDP]
 *                       description: Protocolo del puerto
 *                       example: "TCP"
 *                     nombreServicio:
 *                       type: string
 *                       description: Nombre del servicio en el puerto
 *                       example: "http"
 *                     puertoVirtual:
 *                       type: integer
 *                       description: Puerto virtual asociado
 *                       example: 8080
 *                 example: [
 *                   {
 *                     "numeroPuertoMaquina": 80,
 *                     "protocolo": "TCP",
 *                     "nombreServicio": "http",
 *                     "puertoVirtual": 8080
 *                   }
 *                 ]
 *     responses:
 *       204:
 *         description: Servicio actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Máquina actualizada con éxito."
 *       400:
 *         description: Error en la petición
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No se han enviado los campos a actualizar."
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
 *         description: Prohibido - No tiene permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: Recurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     formatoInvalido:
 *                       value: "Máquina no encontrada (Formato de ID inválido)."
 *                     maquinaNoEncontrada:
 *                       value: "Máquina no encontrada"
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

router.patch(
	"/:uuid/servicios/:uuidServicio",
	[
		verificarToken,
		tienePermiso("maquina:crearServicios", true),
		validarTipos(servicioPatchSchema),
	],
	patchServicio,
);

/**
 * @swagger
 * /{uuid}/servicios/{uuidServicio}:
 *   delete:
 *     summary: Eliminar un servicio de una máquina
 *     description: Elimina un servicio específico asociado a una máquina mediante su UUID.
 *     tags:
 *       - Servicios
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la máquina
 *       - in: path
 *         name: uuidServicio
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del servicio a eliminar
 *     responses:
 *       204:
 *         description: Servicio eliminado
 *       401:
 *         description: No autorizado - Token inválido o ausente
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Máquina o servicio no encontrado
 *       500:
 *         description: Error interno del servidor
 */

router.delete(
	"/:uuid/servicios/:uuidServicio",
	[verificarToken, tienePermiso("maquina:borrarServicios", true)],
	deleteServicioByUuid,
);

//--------------------------------
//------- Calendario -------------
//--------------------------------

/**
 * @swagger
 * /api/maquina/{uuid}/reserva:
 *   post:
 *     summary: Crea una nueva reserva en el calendario para una máquina
 *     description: |
 *       Crea una reserva para una máquina específica (solo servidores).
 *       Requiere autenticación y el permiso "maquina:calendario".
 *       El usuario autenticado quedará registrado como el creador de la reserva.
 *       Las reservas solo pueden realizarse en máquinas que sean servidores.
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
 *         description: UUID de la máquina (servidor) a reservar
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fechaInicio
 *               - nombre
 *               - fechaFin
 *             properties:
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de inicio de la reserva (formato ISO 8601)
 *                 example: "2026-03-01T10:00:00.000Z"
 *               fechaFin:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de fin de la reserva (formato ISO 8601)
 *                 example: "2026-03-05T18:00:00.000Z"
 *               nombre:
 *                 type: string
 *                 description: Nombre o título de la reserva
 *                 example: "Reserva para pruebas GPU"
 *               descripcion:
 *                 type: string
 *                 description: Descripción detallada de la reserva (opcional)
 *                 example: "Pruebas de rendimiento con modelos de IA"
 *           examples:
 *             ejemploCompleto:
 *               summary: Reserva con todos los campos
 *               value:
 *                 fechaInicio: "2026-03-01T10:00:00.000Z"
 *                 fechaFin: "2026-03-05T18:00:00.000Z"
 *                 nombre: "Reserva IA"
 *                 descripcion: "Reserva para pruebas GPU con TensorFlow"
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/reservas/987c3bdb-50c5-4ae5-8356-a18f17856ceb"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva creada con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único de la reserva creada
 *                   example: "987c3bdb-50c5-4ae5-8356-a18f17856ceb"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://api.ejemplo.com/api/reservas/987c3bdb-50c5-4ae5-8356-a18f17856ceb"
 *       400:
 *         description: Error de validación - Formato de UUID de máquina inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Formato de ID de máquina inválido."
 *       401:
 *         description: |
 *           No autorizado. Puede deberse a:
 *           * Token no proporcionado o inválido
 *           * Sesión de usuario no válida (ID de usuario no identificado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               tokenInvalido:
 *                 summary: Token inválido o no proporcionado
 *                 value:
 *                   error: "No autorizado"
 *               sesionInvalida:
 *                 summary: ID de usuario no identificado
 *                 value:
 *                   error: "Sesión de usuario no válida."
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
 *           Máquina no encontrada o no es un servidor.
 *           Las reservas solo se pueden realizar en servidores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "La máquina especificada no existe o no es un servidor. Las reservas solo se pueden realizar en servidores."
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
	"/:uuid/reserva",
	[
		verificarToken,
		tienePermiso("maquina:calendario", true),
		validarTipos(reservaSchema),
	],
	postCalendario,
);

/**
 * @swagger
 * /api/maquina/{uuid}/reserva:
 *   get:
 *     summary: Obtiene las reservas de una máquina específica en un rango de fechas
 *     description: |
 *       Retorna todas las reservas de una máquina que se solapan con el rango de fechas especificado.
 *       Si no se proporcionan fechas, se usa el rango por defecto: desde hoy hasta dentro de un mes.
 *       La seguridad se aplica a nivel de query: solo se devuelven reservas si el usuario autenticado
 *       es el responsable o tiene permisos especiales (admin:total o maquina:calendario:{uuid}).
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
 *         description: UUID de la máquina a consultar
 *         example: "014f5a5e-9894-4f25-a009-45668244c1ae"
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio del rango (ISO 8601). Si no se proporciona, se usa la fecha actual.
 *         example: "2026-03-01T00:00:00.000Z"
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin del rango (ISO 8601). Si no se proporciona, se usa un mes después de la fecha actual.
 *         example: "2026-04-01T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Listado de reservas obtenido con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Listado de reservas obtenido con éxito."
 *                 info:
 *                   type: array
 *                   description: Array de reservas de la máquina
 *                   items:
 *                     type: object
 *                     properties:
 *                       idcalendario:
 *                         type: integer
 *                         description: ID interno de la reserva
 *                         example: 1
 *                       uuidcalendario:
 *                         type: string
 *                         format: uuid
 *                         description: UUID único de la reserva
 *                         example: "342e1c0a-137b-4980-b7b3-d815f935c28f"
 *                       nombre_reserva:
 *                         type: string
 *                         description: Nombre o título de la reserva
 *                         example: "Reserva IA"
 *                       descripcion:
 *                         type: string
 *                         description: Descripción detallada de la reserva
 *                         example: "Reserva para pruebas GPU"
 *                       fechainicio:
 *                         type: string
 *                         format: date-time
 *                         description: Fecha y hora de inicio de la reserva (ISO 8601)
 *                         example: "2026-03-01T00:00:00.000Z"
 *                       fechafin:
 *                         type: string
 *                         format: date-time
 *                         description: Fecha y hora de fin de la reserva (ISO 8601)
 *                         example: "2026-03-05T00:00:00.000Z"
 *                       nombre_maquina:
 *                         type: string
 *                         description: Nombre de la máquina reservada
 *                         example: "srv-gpu-01"
 *                       uuidmaquina:
 *                         type: string
 *                         format: uuid
 *                         description: UUID de la máquina reservada
 *                         example: "014f5a5e-9894-4f25-a009-45668244c1ae"
 *                       uuid_responsable:
 *                         type: string
 *                         format: uuid
 *                         description: UUID del usuario responsable de la reserva
 *                         example: "3dcb7dc3-6742-4609-95f6-9594e4e7927e"
 *                       id_responsable:
 *                         type: integer
 *                         description: ID interno del usuario responsable
 *                         example: 2
 *                       nombre_completo_responsable:
 *                         type: string
 *                         description: Nombre completo del responsable
 *                         example: "test test test"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Formato de UUID inválido"
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
 *                   example: "Error al obtener el calendario."
 */

router.get(
	"/:uuid/reserva",
	[verificarToken, tienePermiso("maquina:calendario", true)],
	getReservasMaquina,
);
export default router;
