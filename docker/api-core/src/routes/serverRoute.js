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
 *     summary: Crea una nueva máquina/servidor
 *     description: |
 *       Registra una nueva máquina en el sistema.
 *       Requiere permisos `maq:postMaquina` (o `admin:total`).
 *
 *       **Campos obligatorios:**
 *       - `nombre`
 *       - `red.direccionIpPrivadaV4`
 *       - `red.puertaEnlaceV4`
 *       - `especificaciones.sistemaOperativo`
 *
 *       Otros campos pueden ser incluidos según el esquema de validación.
 *     tags: [Máquinas]
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
 *               - nombre
 *               - red
 *               - especificaciones
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de la máquina
 *                 example: "servidor-web-01"
 *               propietarios:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los usuarios propietarios
 *                 example: [1, 3]
 *               red:
 *                 type: object
 *                 required:
 *                   - direccionIpPrivadaV4
 *                   - puertaEnlaceV4
 *                 properties:
 *                   direccionIpPrivadaV4:
 *                     type: string
 *                     description: Dirección IP privada IPv4
 *                     example: "192.168.1.100"
 *                   puertaEnlaceV4:
 *                     type: string
 *                     description: Puerta de enlace IPv4
 *                     example: "192.168.1.1"
 *                   direccionIpPublicaV4:
 *                     type: string
 *                     description: Dirección IP pública IPv4 (opcional)
 *                     example: "203.0.113.10"
 *                   dns:
 *                     type: string
 *                     description: Servidor DNS (opcional)
 *                     example: "8.8.8.8"
 *               especificaciones:
 *                 type: object
 *                 required:
 *                   - sistemaOperativo
 *                 properties:
 *                   sistemaOperativo:
 *                     type: string
 *                     description: Sistema operativo instalado
 *                     example: "Ubuntu 22.04 LTS"
 *                   cpu:
 *                     type: string
 *                     description: Especificación de CPU
 *                     example: "Intel Xeon E5-2680 v4"
 *                   ram:
 *                     type: string
 *                     description: Cantidad de memoria RAM
 *                     example: "64GB DDR4"
 *                   almacenamiento:
 *                     type: string
 *                     description: Especificación de almacenamiento
 *                     example: "2x 1TB SSD NVMe"
 *           examples:
 *             ejemploBasico:
 *               summary: Máquina básica
 *               value:
 *                 nombre: "servidor-web-01"
 *                 red:
 *                   direccionIpPrivadaV4: "192.168.1.100"
 *                   puertaEnlaceV4: "192.168.1.1"
 *                 especificaciones:
 *                   sistemaOperativo: "Ubuntu 22.04 LTS"
 *             ejemploCompleto:
 *               summary: Máquina con todos los campos
 *               value:
 *                 nombre: "servidor-db-01"
 *                 propietarios: [2, 5]
 *                 red:
 *                   direccionIpPrivadaV4: "10.0.0.50"
 *                   puertaEnlaceV4: "10.0.0.1"
 *                   direccionIpPublicaV4: "198.51.100.42"
 *                   dns: "1.1.1.1"
 *                 especificaciones:
 *                   sistemaOperativo: "CentOS 7"
 *                   cpu: "AMD EPYC 7302"
 *                   ram: "128GB"
 *                   almacenamiento: "4x 2TB SAS"
 *     responses:
 *       201:
 *         description: Máquina creada exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/maquina/550e8400-e29b-41d4-a716-446655440000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Máquina creada con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID de la máquina creada
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso
 *                   example: "https://api.ejemplo.com/api/maquina/550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Error de validación (faltan campos obligatorios)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Faltan parámetros obligatorios nombre, red, especificaciones, red.direccionIpPrivadaV4, red.puertaEnlaceV4"
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
 *         description: Prohibido - No tiene el permiso "maq:postMaquina"
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
		tienePermiso("maq:postMaquina"),
		validarTipos(maquinaSchema),
	],
	postMaquina,
);

/**
 * @swagger
 * /api/maquina:
 *   get:
 *     summary: Obtiene listado paginado de máquinas/servidores
 *     description: |
 *       Retorna un array de máquinas. El resultado varía según los permisos:
 *       - `admin:total` o `maq:getAll` → todas las máquinas
 *       - `maq:getServer` → solo servidores (`esservidor = true`)
 *       - Otros → 403
 *       Soporta paginación mediante los parámetros `page` y `limit`, y filtro por nombre.
 *     tags: [Máquinas]
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5
 *         description: Cantidad de resultados por página
 *         example: 5
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre de la máquina (búsqueda parcial)
 *         example: "srv"
 *     responses:
 *       200:
 *         description: Listado de máquinas obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idmaquina:
 *                     type: integer
 *                     description: ID interno de la máquina
 *                     example: 1
 *                   nombre:
 *                     type: string
 *                     description: Nombre de la máquina
 *                     example: "srv-docker-01"
 *                   caducidadssl:
 *                     type: string
 *                     format: date-time
 *                     description: Fecha de caducidad del certificado SSL
 *                     example: "2026-12-31T00:00:00.000Z"
 *                   certificadosslactivo:
 *                     type: boolean
 *                     description: Indica si el certificado SSL está activo
 *                     example: true
 *                   emisorssl:
 *                     type: string
 *                     description: Emisor del certificado SSL
 *                     example: "LetsEncrypt"
 *                   direccionipprivadav4:
 *                     type: string
 *                     description: Dirección IP privada IPv4
 *                     example: "192.168.1.10"
 *                   uuidmaquina:
 *                     type: string
 *                     format: uuid
 *                     description: UUID único de la máquina
 *                     example: "93ec7f27-bcb5-427d-934f-1772e8e30ce9"
 *                   direccionippublicav4:
 *                     type: string
 *                     description: Dirección IP pública IPv4
 *                     example: "80.80.80.10"
 *                   direccionipprivadav6:
 *                     type: string
 *                     nullable: true
 *                     description: Dirección IP privada IPv6
 *                     example: null
 *                   direccionippublicav6:
 *                     type: string
 *                     nullable: true
 *                     description: Dirección IP pública IPv6
 *                     example: null
 *                   puertaenlacev4:
 *                     type: string
 *                     description: Puerta de enlace IPv4
 *                     example: "192.168.1.1"
 *                   puertaenlacev6:
 *                     type: string
 *                     nullable: true
 *                     description: Puerta de enlace IPv6
 *                     example: null
 *                   ram:
 *                     type: integer
 *                     description: Cantidad de RAM en GB
 *                     example: 64
 *                   sistemaoperativo:
 *                     type: string
 *                     description: Sistema operativo
 *                     example: "Ubuntu 22.04"
 *                   esservidor:
 *                     type: boolean
 *                     description: Indica si la máquina es un servidor
 *                     example: false
 *       400:
 *         description: Parámetros de paginación inválidos (page/limit < 1)
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
 *         description: Prohibido - No tiene ninguno de los permisos requeridos (maq:getAll, maq:getServer, admin:total)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Careces de los permisos necesarios."
 *       404:
 *         description: No se encontraron máquinas con el filtro aplicado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se han encontrado maquinas/servidores que coincidan con: srv"
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
router.get("/", verificarToken, getMaquinas);

/**
 * @swagger
 * /api/maquina/{uuid}:
 *   get:
 *     summary: Obtiene los detalles de una máquina por su UUID
 *     description: |
 *       Retorna la información detallada de una máquina concreta.
 *       El acceso depende de los permisos del usuario:
 *       - `admin:total` o `maq:getAll` → puede ver cualquier máquina.
 *       - `maq:getServer` → solo puede ver máquinas que sean servidores (`esservidor: true`).
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina a consultar
 *         example: "93ec7f27-bcb5-427d-934f-1772e8e30ce9"
 *     responses:
 *       200:
 *         description: Máquina encontrada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Máquina encontrada con éxito."
 *                 info:
 *                   type: object
 *                   properties:
 *                     idmaquina:
 *                       type: integer
 *                       description: ID interno de la máquina
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       description: Nombre de la máquina
 *                       example: "srv-docker-01"
 *                     caducidadssl:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha de caducidad del certificado SSL
 *                       example: "2026-12-31T00:00:00.000Z"
 *                     certificadosslactivo:
 *                       type: boolean
 *                       description: Indica si el certificado SSL está activo
 *                       example: true
 *                     emisorssl:
 *                       type: string
 *                       description: Emisor del certificado SSL
 *                       example: "LetsEncrypt"
 *                     direccionipprivadav4:
 *                       type: string
 *                       description: Dirección IP privada IPv4
 *                       example: "192.168.1.10"
 *                     uuidmaquina:
 *                       type: string
 *                       format: uuid
 *                       description: UUID único de la máquina
 *                       example: "93ec7f27-bcb5-427d-934f-1772e8e30ce9"
 *                     direccionippublicav4:
 *                       type: string
 *                       description: Dirección IP pública IPv4
 *                       example: "80.80.80.10"
 *                     direccionipprivadav6:
 *                       type: string
 *                       nullable: true
 *                       description: Dirección IP privada IPv6 (puede ser nulo)
 *                       example: null
 *                     direccionippublicav6:
 *                       type: string
 *                       nullable: true
 *                       description: Dirección IP pública IPv6 (puede ser nulo)
 *                       example: null
 *                     puertaenlacev4:
 *                       type: string
 *                       description: Puerta de enlace IPv4
 *                       example: "192.168.1.1"
 *                     puertaenlacev6:
 *                       type: string
 *                       nullable: true
 *                       description: Puerta de enlace IPv6 (puede ser nulo)
 *                       example: null
 *                     ram:
 *                       type: integer
 *                       description: Cantidad de RAM en GB
 *                       example: 64
 *                     sistemaoperativo:
 *                       type: string
 *                       description: Sistema operativo
 *                       example: "Ubuntu 22.04"
 *                     esservidor:
 *                       type: boolean
 *                       description: Indica si la máquina es un servidor
 *                       example: false
 *       400:
 *         description: Error con los parámetros de la petición (UUID no proporcionado o formato inválido)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error con los parámetros del get máquina."
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
 *         description: |
 *           Prohibido. Puede deberse a:
 *           * No se tienen los permisos necesarios (ni admin:total, maq:getAll ni maq:getServer)
 *           * El usuario solo tiene permiso `maq:getServer` pero la máquina consultada no es un servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Careces de los permisos necesarios."
 *       404:
 *         description: |
 *           Máquina no encontrada. Puede deberse a:
 *           * Formato de UUID inválido (el mensaje en ese caso es distinto)
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
 *                   error: "Máquina no encontrada."
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

router.get("/:uuid", verificarToken, getMaquina);

/**
 * @swagger
 * /api/maquina/{uuid}:
 *   patch:
 *     summary: Actualiza parcialmente una máquina
 *     description: |
 *       Permite modificar uno o más campos de una máquina existente.
 *       Solo se actualizan los campos proporcionados en el cuerpo de la petición.
 *       Requiere el permiso `maq:editServer` (o `admin:total`).
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina a actualizar
 *         example: "93ec7f27-bcb5-427d-934f-1772e8e30ce9"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de la máquina
 *                 example: "srv-web-01"
 *               caducidadssl:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de caducidad del certificado SSL
 *                 example: "2027-01-01T00:00:00.000Z"
 *               certificadosslactivo:
 *                 type: boolean
 *                 description: Indica si el certificado SSL está activo
 *                 example: true
 *               emisorssl:
 *                 type: string
 *                 description: Emisor del certificado SSL
 *                 example: "LetsEncrypt"
 *               direccionipprivadav4:
 *                 type: string
 *                 description: Dirección IP privada IPv4
 *                 example: "192.168.1.15"
 *               direccionippublicav4:
 *                 type: string
 *                 description: Dirección IP pública IPv4
 *                 example: "80.80.80.15"
 *               direccionipprivadav6:
 *                 type: string
 *                 nullable: true
 *                 description: Dirección IP privada IPv6
 *                 example: "2001:db8::1"
 *               direccionippublicav6:
 *                 type: string
 *                 nullable: true
 *                 description: Dirección IP pública IPv6
 *                 example: "2001:db8:85a3::8a2e:370:7334"
 *               puertaenlacev4:
 *                 type: string
 *                 description: Puerta de enlace IPv4
 *                 example: "192.168.1.1"
 *               puertaenlacev6:
 *                 type: string
 *                 nullable: true
 *                 description: Puerta de enlace IPv6
 *                 example: "2001:db8::1"
 *               ram:
 *                 type: integer
 *                 description: Cantidad de RAM en GB
 *                 example: 128
 *               sistemaoperativo:
 *                 type: string
 *                 description: Sistema operativo
 *                 example: "Ubuntu 24.04"
 *               esservidor:
 *                 type: boolean
 *                 description: Indica si la máquina es un servidor
 *                 example: true
 *     responses:
 *       204:
 *         description: Máquina actualizada correctamente (sin contenido)
 *       400:
 *         description: No se han enviado campos a actualizar
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
 *         description: Prohibido - No tiene el permiso "maq:editServer"
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
 *           Máquina no encontrada. Puede deberse a:
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
 *                   error: "Máquina no encontrada"
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
 *     summary: Elimina una máquina
 *     description: |
 *       Elimina permanentemente una máquina del sistema.
 *       También elimina los permisos asociados a la máquina (por ejemplo, aquellos que contengan el UUID en su alias).
 *       Requiere el permiso `maq:deleteServer` (o `admin:total`).
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina a eliminar
 *         example: "93ec7f27-bcb5-427d-934f-1772e8e30ce9"
 *     responses:
 *       204:
 *         description: Máquina eliminada correctamente (sin contenido)
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
 *         description: Prohibido - No tiene el permiso "maq:deleteServer"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: Máquina no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Máquina no encontrada."
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

router.delete(
	"/:uuid",
	[verificarToken, tienePermiso("maq:deleteServer")],
	deleteMaquina,
);

/**
 * @swagger
 * /api/maquina/{uuid}/servicios:
 *   get:
 *     summary: Obtiene los servicios asociados a una máquina
 *     description: |
 *       Retorna un listado paginado de los servicios que están corriendo en una máquina específica.
 *       Incluye detalles del servicio y los puertos asociados.
 *       Requiere el permiso `maquina:verServicios` (con flag true) o `admin:total`.
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina
 *         example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5
 *         description: Cantidad de resultados por página
 *         example: 5
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre del servicio (búsqueda parcial)
 *         example: "API"
 *     responses:
 *       200:
 *         description: Información de los servicios obtenida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información de los servicios obtenida con éxito."
 *                 info:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idservicio:
 *                         type: integer
 *                         description: ID interno del servicio
 *                         example: 1
 *                       uuidservicio:
 *                         type: string
 *                         format: uuid
 *                         description: UUID del servicio
 *                         example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *                       nombreservicio:
 *                         type: string
 *                         description: Nombre del servicio
 *                         example: "API-IA"
 *                       descripciontecnica:
 *                         type: string
 *                         description: Descripción técnica del servicio
 *                         example: "Servicio IA REST"
 *                       entorno:
 *                         type: string
 *                         description: Entorno del servicio (PROD, DESARROLLO, etc.)
 *                         example: "PROD"
 *                       publico:
 *                         type: boolean
 *                         description: Indica si el servicio es público
 *                         example: true
 *                       softwarebase:
 *                         type: string
 *                         description: Software base del servicio
 *                         example: "Python 3.11"
 *                       activo:
 *                         type: boolean
 *                         description: Estado activo del servicio
 *                         example: true
 *                       nivelseveridad:
 *                         type: string
 *                         description: Nivel de severidad del servicio
 *                         example: "alto"
 *                       idusuario:
 *                         type: integer
 *                         description: ID del usuario responsable
 *                         example: 2
 *                       idpeticion:
 *                         type: integer
 *                         description: ID de la petición asociada
 *                         example: 1
 *                       uuidpeticion:
 *                         type: string
 *                         format: uuid
 *                         description: UUID de la petición asociada
 *                         example: "a682584b-a138-475d-99ac-3b78565681d9"
 *                       uuidmaquina:
 *                         type: string
 *                         format: uuid
 *                         description: UUID de la máquina
 *                         example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *                       lista_puertos:
 *                         type: array
 *                         description: Lista de puertos asociados al servicio
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               description: ID del puerto
 *                               example: 1
 *                             puerto:
 *                               type: integer
 *                               description: Número de puerto
 *                               example: 443
 *                             protocolo:
 *                               type: string
 *                               description: Protocolo (TCP/UDP)
 *                               example: "TCP"
 *                             nombre:
 *                               type: string
 *                               description: Nombre del servicio en el puerto
 *                               example: "HTTPS"
 *       400:
 *         description: Parámetros de consulta inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Parámetros de paginación inválidos"
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
 *         description: Prohibido - No tiene el permiso "maquina:verServicios"
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
 *           Máquina no encontrada. Puede deberse a:
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
 *                   error: "Máquina no encontrada."
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
	"/:uuid/servicios",
	[verificarToken, tienePermiso("maquina:verServicios", true)],
	getServiciosPorMaquina,
);

/**
 * @swagger
 * /api/maquina/{uuid}/servicios:
 *   post:
 *     summary: Crea un nuevo servicio asociado a una máquina
 *     description: |
 *       Crea un servicio y lo asocia a la máquina especificada.
 *       Opcionalmente permite asociar otros servidores y definir puertos abiertos.
 *       Requiere el permiso `maquina:crearServicios` (con flag true) o `admin:total`.
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina principal donde se aloja el servicio
 *         example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombreServicio
 *               - idPeticion
 *               - idUsuario
 *             properties:
 *               nombreServicio:
 *                 type: string
 *                 description: Nombre del servicio
 *                 example: "API-IA"
 *               descripcionTecnica:
 *                 type: string
 *                 description: Descripción técnica del servicio
 *                 example: "Servicio IA REST"
 *               entorno:
 *                 type: string
 *                 description: Entorno del servicio (ej. PROD, DESARROLLO)
 *                 example: "PROD"
 *               publico:
 *                 type: boolean
 *                 description: Indica si el servicio es público
 *                 example: true
 *               softwareBase:
 *                 type: string
 *                 description: Software base del servicio
 *                 example: "Python 3.11"
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del servicio
 *                 example: true
 *               nivelSeveridad:
 *                 type: string
 *                 description: Nivel de severidad (ej. bajo, medio, alto)
 *                 example: "alto"
 *               idUsuario:
 *                 type: integer
 *                 description: ID del usuario responsable
 *                 example: 2
 *               idPeticion:
 *                 type: integer
 *                 description: ID de la petición asociada
 *                 example: 1
 *               servidores:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de otros servidores donde también corre el servicio (opcional). La máquina principal se añade automáticamente.
 *                 example: [3, 5]
 *               puertosAbiertos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - numeroPuertoMaquina
 *                     - protocolo
 *                     - nombreServicio
 *                   properties:
 *                     numeroPuertoMaquina:
 *                       type: integer
 *                       description: Número de puerto en la máquina
 *                       example: 443
 *                     protocolo:
 *                       type: string
 *                       enum: [TCP, UDP]
 *                       description: Protocolo del puerto
 *                       example: "TCP"
 *                     nombreServicio:
 *                       type: string
 *                       description: Nombre del servicio en ese puerto
 *                       example: "HTTPS"
 *                     puertoVirtual:
 *                       type: integer
 *                       description: Puerto virtual (si aplica)
 *                       example: 8443
 *                 description: Lista de puertos abiertos asociados al servicio
 *                 example: [
 *                   {
 *                     "numeroPuertoMaquina": 443,
 *                     "protocolo": "TCP",
 *                     "nombreServicio": "HTTPS",
 *                     "puertoVirtual": 8443
 *                   }
 *                 ]
 *           examples:
 *             ejemploCompleto:
 *               summary: Creación de servicio con puertos y servidores adicionales
 *               value:
 *                 nombreServicio: "API-IA"
 *                 descripcionTecnica: "Servicio IA REST"
 *                 entorno: "PROD"
 *                 publico: true
 *                 softwareBase: "Python 3.11"
 *                 activo: true
 *                 nivelSeveridad: "alto"
 *                 idUsuario: 2
 *                 idPeticion: 1
 *                 servidores: [3, 5]
 *                 puertosAbiertos: [
 *                   {
 *                     "numeroPuertoMaquina": 443,
 *                     "protocolo": "TCP",
 *                     "nombreServicio": "HTTPS",
 *                     "puertoVirtual": 8443
 *                   }
 *                 ]
 *     responses:
 *       201:
 *         description: Servicio creado con éxito
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/maquina/ee99001d-0157-424f-bd38-b2d82762de08/servicios/20bad862-554b-4d37-b23c-580cde22b63f"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Servicio creado con éxito"
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   description: UUID del servicio creado
 *                   example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso
 *                   example: "https://api.ejemplo.com/api/maquina/ee99001d-0157-424f-bd38-b2d82762de08/servicios/20bad862-554b-4d37-b23c-580cde22b63f"
 *       400:
 *         description: Error de validación (faltan campos obligatorios o formato inválido)
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
 *         description: Prohibido - No tiene el permiso "maquina:crearServicios"
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
 *           Máquina no encontrada. Puede deberse a:
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
 *                   error: "Maquina no encontrada."
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
 * /api/maquina/{uuid}/servicios/{uuidServicio}:
 *   get:
 *     summary: Obtiene los detalles de un servicio asociado a una máquina
 *     description: |
 *       Retorna la información detallada de un servicio concreto que corre en la máquina indicada.
 *       Requiere el permiso `maquina:verServicios` (con flag true) o `admin:total`.
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina
 *         example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *       - in: path
 *         name: uuidServicio
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del servicio a consultar
 *         example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *     responses:
 *       200:
 *         description: Información obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información obtenida de manera correcta."
 *                 info:
 *                   type: object
 *                   properties:
 *                     idservicio:
 *                       type: integer
 *                       description: ID interno del servicio
 *                       example: 1
 *                     uuidservicio:
 *                       type: string
 *                       format: uuid
 *                       description: UUID del servicio
 *                       example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *                     nombreservicio:
 *                       type: string
 *                       description: Nombre del servicio
 *                       example: "API-IA"
 *                     descripciontecnica:
 *                       type: string
 *                       description: Descripción técnica del servicio
 *                       example: "Servicio IA REST"
 *                     entorno:
 *                       type: string
 *                       description: Entorno del servicio (PROD, DESARROLLO, etc.)
 *                       example: "PROD"
 *                     publico:
 *                       type: boolean
 *                       description: Indica si el servicio es público
 *                       example: true
 *                     softwarebase:
 *                       type: string
 *                       description: Software base del servicio
 *                       example: "Python 3.11"
 *                     activo:
 *                       type: boolean
 *                       description: Estado activo del servicio
 *                       example: true
 *                     nivelseveridad:
 *                       type: string
 *                       description: Nivel de severidad del servicio
 *                       example: "alto"
 *                     idusuario:
 *                       type: integer
 *                       description: ID del usuario responsable
 *                       example: 2
 *                     idpeticion:
 *                       type: integer
 *                       description: ID de la petición asociada
 *                       example: 1
 *                     uuidpeticion:
 *                       type: string
 *                       format: uuid
 *                       description: UUID de la petición asociada
 *                       example: "a682584b-a138-475d-99ac-3b78565681d9"
 *                     uuidmaquina:
 *                       type: string
 *                       format: uuid
 *                       description: UUID de la máquina principal
 *                       example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *                     lista_puertos:
 *                       type: array
 *                       description: Puertos asociados al servicio
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: ID del puerto
 *                             example: 1
 *                           puerto:
 *                             type: integer
 *                             description: Número de puerto
 *                             example: 443
 *                           protocolo:
 *                             type: string
 *                             description: Protocolo (TCP/UDP)
 *                             example: "TCP"
 *                           nombre:
 *                             type: string
 *                             description: Nombre del servicio en el puerto
 *                             example: "HTTPS"
 *       400:
 *         description: Petición mal formada (faltan parámetros)
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
 *         description: Prohibido - No tiene el permiso "maquina:verServicios"
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
 *           No encontrado. Puede deberse a:
 *           * Formato de UUID inválido (código 404 con mensaje específico)
 *           * Máquina no encontrada en la base de datos
 *           * Servicio no existe o no está asociado a la máquina indicada
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
 *                   error: "Máquina o servicio no encontrado (Formato de ID inválido)."
 *               maquinaNoExiste:
 *                 summary: UUID de máquina válido pero no existe
 *                 value:
 *                   error: "Máquina no encontrada."
 *               servicioNoAsociado:
 *                 summary: Servicio no asociado a esta máquina
 *                 value:
 *                   error: "El servicio no existe o no está asociado a esta máquina."
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
 * /api/maquina/{uuid}/servicios/{uuidServicio}:
 *   delete:
 *     summary: Elimina un servicio específico asociado a una máquina
 *     description: |
 *       Borra permanentemente un servicio y todas sus relaciones:
 *       - Elimina las entradas en la tabla `corre` (relación con máquinas)
 *       - Elimina los puertos asociados al servicio
 *       - Elimina el servicio en sí
 *       Requiere el permiso `maquina:borrarServicios` (con flag true) o `admin:total`.
 *     tags: [Máquinas]
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
 *         description: UUID de la máquina a la que pertenece el servicio
 *         example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *       - in: path
 *         name: uuidServicio
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del servicio a eliminar
 *         example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *     responses:
 *       204:
 *         description: Servicio eliminado correctamente (sin contenido)
 *       400:
 *         description: Petición mal formada (faltan parámetros)
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
 *         description: Prohibido - No tiene el permiso "maquina:borrarServicios"
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
 *           Recurso no encontrado. Puede deberse a:
 *           * Formato de UUID inválido en alguno de los parámetros
 *           * El servicio no existe o no está asociado a la máquina especificada
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
 *                   error: "Máquina o servicio no encontrado (Formato de ID inválido)."
 *               noAsociado:
 *                 summary: Servicio no pertenece a la máquina
 *                 value:
 *                   error: "No se puede eliminar: El servicio no existe o no pertenece a la máquina especificada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno al eliminar el servicio."
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
