import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import {
	postProyectoGitlab,
	getProyectoGitlab,
	getProyectoGitlabByUuid,
	patchProyectoGitlab
} from "../controller/proyectosGitlabController.js";

const router = express.Router();

/**
 * @swagger
 * /api/proyectosgitlab:
 *   post:
 *     summary: Crea un nuevo proyecto de GitLab
 *     description: Endpoint para crear un nuevo proyecto de GitLab con sus participantes asociados
 *     tags: [Proyectos GitLab]
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
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del proyecto (campo obligatorio)
 *                 example: "Proyecto Alpha"
 *                 minLength: 1
 *                 maxLength: 255
 *               descripcion:
 *                 type: string
 *                 description: Descripción detallada del proyecto
 *                 example: "Proyecto principal de desarrollo backend para la migración de microservicios"
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio del proyecto (formato YYYY-MM-DD)
 *                 example: "2024-01-15"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 description: Fecha de finalización del proyecto (formato YYYY-MM-DD)
 *                 example: "2024-12-31"
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del proyecto
 *                 example: true
 *                 default: true
 *               participantes:
 *                 type: array
 *                 description: Array de IDs de usuarios que participan en el proyecto
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 example: [1, 2, 3, 5]
 *                 uniqueItems: true
 *     responses:
 *       201:
 *         description: Proyecto de GitLab creado exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto gitlab creado con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único del proyecto creado
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://localhost:8080/api/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación - Petición mal formada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición mal formada."
 *             examples:
 *               nombreFaltante:
 *                 summary: Nombre no proporcionado
 *                 value:
 *                   error: "Petición mal formada."
 *               formatoInvalido:
 *                 summary: Formato de fecha inválido
 *                 value:
 *                   error: "Petición mal formada."
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
 *         headers:
 *           WWW-Authenticate:
 *             schema:
 *               type: string
 *             description: Indica el método de autenticación requerido
 *             example: "Bearer"
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
	[verificarToken, tienePermiso("gitlab:postProyecto")],
	postProyectoGitlab,
);

/**
 * @swagger
 * /api/proyectosgitlab:
 *   get:
 *     summary: Obtiene lista paginada de proyectos GitLab
 *     description: Retorna una lista paginada de proyectos GitLab con filtrado opcional por nombre
 *     tags: [Proyectos GitLab]
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
 *           maximum: 100
 *           default: 5
 *         description: Cantidad de proyectos por página (máx. 100)
 *         example: 10
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre del proyecto (búsqueda parcial case-insensitive)
 *         example: "proyecto"
 *     responses:
 *       200:
 *         description: Lista de proyectos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lista de proyectos de gitlab devuelta correctamente."
 *                 info:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     rows:
 *                       type: array
 *                       description: Array de proyectos
 *                       items:
 *                         type: object
 *                         properties:
 *                           idproyecto:
 *                             type: integer
 *                             description: ID interno del proyecto
 *                             example: 1
 *                           uuidproyecto:
 *                             type: string
 *                             format: uuid
 *                             description: UUID del proyecto
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                           nombre:
 *                             type: string
 *                             description: Nombre del proyecto
 *                             example: "Proyecto Alpha"
 *                           descripcion:
 *                             type: string
 *                             description: Descripción del proyecto
 *                             example: "Proyecto principal de desarrollo backend"
 *                           fechainicio:
 *                             type: string
 *                             format: date
 *                             description: Fecha de inicio
 *                             example: "2024-01-15"
 *                           fechafin:
 *                             type: string
 *                             format: date
 *                             description: Fecha de finalización
 *                             example: "2024-12-31"
 *                           activo:
 *                             type: boolean
 *                             description: Estado del proyecto
 *                             example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       description: Número total de proyectos que coinciden con el filtro
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       description: Número total de páginas
 *                       example: 3
 *                     currentPage:
 *                       type: integer
 *                       description: Página actual
 *                       example: 1
 *       400:
 *         description: No se encontraron proyectos con el filtro especificado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se han encontrado usuarios que coincidan con: proyecto"
 *             examples:
 *               sinResultados:
 *                 summary: Búsqueda sin resultados
 *                 value:
 *                   message: "No se han encontrado usuarios que coincidan con: proyectoInexistente"
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
 *         headers:
 *           WWW-Authenticate:
 *             schema:
 *               type: string
 *             description: Indica el método de autenticación requerido
 *             example: "Bearer"
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
	[verificarToken, tienePermiso("gitlab:getProyecto")],
	getProyectoGitlab,
);

/**
 * @swagger
 * /api/proyectosgitlab/{uuid}:
 *   get:
 *     summary: Obtiene un proyecto de GitLab por su UUID
 *     description: Retorna los detalles de un proyecto específico incluyendo la lista de participantes
 *     tags: [Proyectos GitLab]
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
 *         description: UUID del proyecto de GitLab
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Proyecto encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proyecto de GitLab encontrado correctamente."
 *                 info:
 *                   type: object
 *                   properties:
 *                     idproyecto:
 *                       type: integer
 *                       description: ID interno del proyecto
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       description: Nombre del proyecto
 *                       example: "Proyecto Alpha"
 *                     descripcion:
 *                       type: string
 *                       description: Descripción del proyecto
 *                       example: "Proyecto principal de desarrollo backend"
 *                     uuidproyecto:
 *                       type: string
 *                       format: uuid
 *                       description: UUID del proyecto
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     fechainicio:
 *                       type: string
 *                       format: date
 *                       description: Fecha de inicio
 *                       example: "2024-01-15"
 *                     fechafin:
 *                       type: string
 *                       format: date
 *                       description: Fecha de finalización
 *                       example: "2024-12-31"
 *                     activo:
 *                       type: boolean
 *                       description: Estado del proyecto
 *                       example: true
 *                     participantes:
 *                       type: array
 *                       description: Lista de participantes del proyecto
 *                       items:
 *                         type: object
 *                         properties:
 *                           idUsuario:
 *                             type: integer
 *                             description: ID del usuario
 *                             example: 5
 *                           nombre:
 *                             type: string
 *                             description: Nombre del usuario
 *                             example: "Juan"
 *                           apellidos:
 *                             type: string
 *                             description: Apellidos completos del usuario
 *                             example: "Pérez García"
 *                       example: [
 *                         {
 *                           "idUsuario": 5,
 *                           "nombre": "Juan",
 *                           "apellidos": "Pérez García"
 *                         },
 *                         {
 *                           "idUsuario": 8,
 *                           "nombre": "María",
 *                           "apellidos": "López Martínez"
 *                         }
 *                       ]
 *       400:
 *         description: Error de validación en el parámetro UUID
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
 *                   error: "Falta el parámetro UUID."
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
 *         description: Proyecto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se ha encontrado ningún proyecto con el UUID: 123e4567-e89b-12d3-a456-426614174000"
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
router.get("/:uuid", [verificarToken, tienePermiso("gitlab:getProyecto")], getProyectoGitlabByUuid);

/**
 * @swagger
 * /api/proyectosgitlab/{uuid}:
 *   patch:
 *     summary: Actualiza parcialmente un proyecto de GitLab
 *     description: Permite modificar los campos de un proyecto existente y/o su lista de participantes. Solo se actualizan los campos proporcionados en el cuerpo de la petición.
 *     tags: [Proyectos GitLab]
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
 *         description: UUID del proyecto de GitLab a actualizar
 *         example: "123e4567-e89b-12d3-a456-426614174000"
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
 *                 description: Nombre del proyecto
 *                 example: "Proyecto Alpha - Actualizado"
 *               descripcion:
 *                 type: string
 *                 description: Descripción del proyecto
 *                 example: "Descripción actualizada del proyecto"
 *               fechainicio:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio (YYYY-MM-DD)
 *                 example: "2024-02-01"
 *               fechafin:
 *                 type: string
 *                 format: date
 *                 description: Fecha de finalización (YYYY-MM-DD)
 *                 example: "2024-11-30"
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del proyecto
 *                 example: false
 *               participantes:
 *                 type: array
 *                 description: Lista de IDs de usuarios participantes (reemplaza la lista completa)
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 example: [2, 5, 8]
 *           examples:
 *             actualizarCampos:
 *               summary: Actualizar solo campos del proyecto
 *               value:
 *                 nombre: "Proyecto Beta v2"
 *                 activo: false
 *             actualizarParticipantes:
 *               summary: Actualizar solo participantes
 *               value:
 *                 participantes: [3, 7, 10]
 *             actualizarTodo:
 *               summary: Actualizar campos y participantes
 *               value:
 *                 nombre: "Proyecto Gamma"
 *                 descripcion: "Nueva descripción"
 *                 fechainicio: "2024-03-01"
 *                 fechafin: "2024-10-31"
 *                 activo: true
 *                 participantes: [1, 4, 6]
 *     responses:
 *       204:
 *         description: Proyecto actualizado exitosamente (sin contenido)
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL del recurso actualizado (opcional)
 *             example: "/api/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación en la solicitud
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
 *                   error: "Falta el parámetro UUID."
 *               uuidInvalido:
 *                 summary: Formato de UUID inválido
 *                 value:
 *                   error: "El formato del UUID proporcionado es inválido."
 *               cuerpoVacio:
 *                 summary: Cuerpo de la petición vacío
 *                 value:
 *                   error: "No se han enviado los campos a actualizar."
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
 *         description: Proyecto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Proyecto gitlab no encontrado"
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

router.patch("/:uuid", 	[verificarToken, tienePermiso("gitlab:postProyecto")], patchProyectoGitlab);

export default router;
