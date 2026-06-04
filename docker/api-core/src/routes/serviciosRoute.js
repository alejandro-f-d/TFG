import express from "express";
import dotenv from "dotenv";
const router = express.Router();

import { getServicios } from "../controller/serviciosController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";

/**
 * @swagger
 * /api/servicios:
 *   get:
 *     summary: Obtiene el listado paginado de todos los servicios
 *     description: |
 *       Retorna una lista paginada de servicios, incluyendo sus puertos asociados.
 *       Soporta filtros por nombre y por estado (activo/inactivo según el campo `activo`).
 *       Requiere el permiso `servicios:getAll` (o `admin:total`).
 *     tags: [Servicios]
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
 *         description: Filtro por nombre del servicio (búsqueda parcial)
 *         example: "API"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtro por estado del servicio (coincidencia parcial con el campo `activo`, ej. "true", "false")
 *         example: "true"
 *     responses:
 *       200:
 *         description: Listado de servicios obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Listado de los servicios obtenido correctamente."
 *                 info:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           idservicio:
 *                             type: integer
 *                             description: ID interno del servicio
 *                             example: 1
 *                           uuidservicio:
 *                             type: string
 *                             format: uuid
 *                             description: UUID del servicio
 *                             example: "20bad862-554b-4d37-b23c-580cde22b63f"
 *                           nombreservicio:
 *                             type: string
 *                             description: Nombre del servicio
 *                             example: "API-IA"
 *                           descripciontecnica:
 *                             type: string
 *                             description: Descripción técnica
 *                             example: "Servicio IA REST"
 *                           entorno:
 *                             type: string
 *                             description: Entorno (PROD, DESARROLLO, TEST, etc.)
 *                             example: "PROD"
 *                           publico:
 *                             type: boolean
 *                             description: Indica si el servicio es público
 *                             example: true
 *                           softwarebase:
 *                             type: string
 *                             description: Software base
 *                             example: "Python 3.11"
 *                           activo:
 *                             type: boolean
 *                             description: Estado activo del servicio
 *                             example: true
 *                           nivelseveridad:
 *                             type: string
 *                             description: Nivel de severidad (bajo, medio, alto, crítico)
 *                             example: "alto"
 *                           idusuario:
 *                             type: integer
 *                             description: ID del usuario responsable
 *                             example: 2
 *                           idpeticion:
 *                             type: integer
 *                             description: ID de la petición asociada
 *                             example: 1
 *                           uuidpeticion:
 *                             type: string
 *                             format: uuid
 *                             description: UUID de la petición asociada
 *                             example: "a682584b-a138-475d-99ac-3b78565681d9"
 *                           uuidmaquina:
 *                             type: string
 *                             format: uuid
 *                             description: UUID de la máquina principal donde corre el servicio
 *                             example: "ee99001d-0157-424f-bd38-b2d82762de08"
 *                           lista_puertos:
 *                             type: array
 *                             description: Puertos asociados al servicio
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   description: ID del puerto
 *                                   example: 1
 *                                 puerto:
 *                                   type: integer
 *                                   description: Número de puerto
 *                                   example: 443
 *                                 protocolo:
 *                                   type: string
 *                                   description: Protocolo (TCP/UDP)
 *                                   example: "TCP"
 *                                 nombre:
 *                                   type: string
 *                                   description: Nombre del servicio en ese puerto
 *                                   example: "HTTPS"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                           description: Número total de servicios que cumplen los filtros
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           description: Número total de páginas
 *                           example: 1
 *                         currentPage:
 *                           type: integer
 *                           description: Página actual
 *                           example: 1
 *                         itemsPerPage:
 *                           type: integer
 *                           description: Cantidad de elementos por página
 *                           example: 5
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
 *         description: Prohibido - No tiene el permiso "servicios:getAll"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: No se encontraron servicios con los filtros aplicados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No se ha encontrado ningún servicio con esos filtros."
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
	[verificarToken, tienePermiso("servicios:getAll")],
	getServicios,
);

export default router;
