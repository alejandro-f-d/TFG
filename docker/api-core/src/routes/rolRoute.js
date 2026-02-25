import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postRole } from "../controller/rolController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { rolSchema } from "../schemas/index.js";
const router = express.Router();

/**
 * @swagger
 * /api/rol:
 *   post:
 *     summary: Crea un nuevo rol con permisos asociados
 *     description: |
 *       Endpoint para crear un nuevo rol en el sistema.
 *       - Asigna automáticamente el permiso `null:null` a todos los roles creados.
 *       - El permiso `admin:total` solo puede ser asignado por usuarios que ya posean dicho permiso.
 *       - El creador del rol queda registrado como el usuario que lo creó.
 *     tags: [Roles]
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
 *               - permisos
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del rol
 *                 example: "Administrador de Proyectos"
 *                 minLength: 1
 *                 maxLength: 255
 *               descripcion:
 *                 type: string
 *                 description: Descripción detallada del rol
 *                 example: "Rol con permisos para gestionar proyectos y usuarios"
 *               permisos:
 *                 type: array
 *                 description: |
 *                   Array de IDs de permisos a asignar al rol.
 *                   - El permiso `null:null` (ID correspondiente) se añade automáticamente.
 *                   - El permiso `admin:total` solo asignable por usuarios admin.
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 example: [1, 2, 3, 5]
 *           examples:
 *           ejemploBasico:
 *             summary: Rol básico con permisos
 *             value:
 *               nombre: "Gestor de Contenido"
 *               descripcion: "Puede gestionar contenido pero no usuarios"
 *               permisos: [10, 11, 12]
 *           ejemploAdmin:
 *             summary: Rol con permisos administrativos (requiere usuario admin)
 *             value:
 *               nombre: "Super Admin"
 *               descripcion: "Acceso total al sistema"
 *               permisos: [1, 2, 3, 4, 5]
 *     responses:
 *       201:
 *         description: Rol creado exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/rol/123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Rol creado con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único del rol creado
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://localhost:8080/api/rol/123e4567-e89b-12d3-a456-426614174000"
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
 *                 summary: Nombre o permisos faltantes
 *                 value:
 *                   error: "Petición mal formada: falta nombre o permisos"
 *               validacionJoi:
 *                 summary: Error de validación de Joi
 *                 value:
 *                   error: "nombre es requerido, permisos debe ser un array"
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
 *           Prohibido - No tiene el permiso requerido
 *           Se requiere el permiso "roles:postRoles" para crear roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: Usuario creador no encontrado en la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor."
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
	[verificarToken, tienePermiso("roles:postRoles"), validarTipos(rolSchema)],
	postRole,
);
export default router;
