import express from "express";
import dotenv from "dotenv";
const router = express.Router();

import { getServicios } from "../controller/serviciosController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";

/**
 * @swagger
 * /api/servicios/:
 *   get:
 *     summary: Obtienes la lista de todos los servicios.
 *     tags: [Servicios]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: filtroNombre
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Información de los usuarios encontrada correctamente.
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Usuario no encontrado con esa información.
 *       500:
 *         description: Error interno del servidor.
 */

router.get(
	"/",
	[verificarToken, tienePermiso("servicios:getAll")],
	getServicios,
);

export default router;
