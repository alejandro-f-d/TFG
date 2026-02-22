import express from "express";
import dotenv from "dotenv";
import {
	postMaquina,
	getMaquinas,
	getMaquina,
	deleteMaquina,
	getServiciosPorMaquina,
} from "../controller/serverController.js";
import {
	postServicios,
	getServicioByUuid,
} from "../controller/serviciosController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
const router = express.Router();

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
	[verificarToken, tienePermiso("maq:postMaquina")],
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
	[verificarToken, tienePermiso("maquina:crearServicios", true)],
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

export default router;
