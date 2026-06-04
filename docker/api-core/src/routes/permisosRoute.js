import express from "express";
const router = express.Router();
import { getAllPermisos } from "../controller/permisosController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";

/**
 * @swagger
 * /api/permisos:
 *   get:
 *     summary: Obtiene la lista completa de permisos del sistema
 *     description: |
 *       Retorna un array con todos los permisos disponibles en la base de datos,
 *       incluyendo su identificador, alias, nombre, descripción y módulo al que pertenecen.
 *
 *       **Permisos requeridos:**
 *       - `perm:listarPermisos` (o `admin:total`)
 *     tags: [Permisos]
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
 *     responses:
 *       200:
 *         description: Listado de permisos obtenido con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Listado de permisos obtenido con éxito."
 *                 perms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idpermiso:
 *                         type: integer
 *                         description: Identificador único del permiso
 *                         example: 1
 *                       alias:
 *                         type: string
 *                         description: Alias único del permiso (utilizado en la lógica de autorización)
 *                         example: "admin:total"
 *                       nombre:
 *                         type: string
 *                         description: Nombre legible del permiso
 *                         example: "Administrador total"
 *                       descripcion:
 *                         type: string
 *                         description: Descripción detallada del alcance del permiso
 *                         example: "Permite al usuario realizar cualquier acción en el sistema."
 *                       modulo:
 *                         type: string
 *                         description: Módulo funcional al que pertenece el permiso
 *                         example: "administrador"
 *             examples:
 *               ejemploExitoso:
 *                 summary: Listado completo de permisos
 *                 value:
 *                   message: "Listado de permisos obtenido con éxito."
 *                   perms: [
 *                     {
 *                       "idpermiso": 1,
 *                       "alias": "admin:total",
 *                       "nombre": "Administrador total",
 *                       "descripcion": "Permite al usuario realizar cualquier acción en el sistema.",
 *                       "modulo": "administrador"
 *                     },
 *                     {
 *                       "idpermiso": 2,
 *                       "alias": "null:null",
 *                       "nombre": "null",
 *                       "descripcion": "null",
 *                       "modulo": "null"
 *                     },
 *                     {
 *                       "idpermiso": 3,
 *                       "alias": "usr:crearUsuario",
 *                       "nombre": "Creación de usuario.",
 *                       "descripcion": "Permite al usuario que lo posee la creación de usuarios en el sistema.",
 *                       "modulo": "usuario"
 *                     }
 *                   ]
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
 *         description: Prohibido - No tiene el permiso "perm:listarPermisos"
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
 *                   example: "Error inesperado ha ocurrido."
 */

router.get(
	"/",
	[verificarToken, tienePermiso("perm:listarPermisos")],
	getAllPermisos,
);
export default router;
