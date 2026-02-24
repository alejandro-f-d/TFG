import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postProyectoGitlab } from "../controller/proyectosGitlabController.js";

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

export default router;
