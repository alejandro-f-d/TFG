import express from "express";
const router = express.Router();
import { getAllPermisos } from '../controller/permisosController.js'



/**
 * @swagger
 * /api/permisos:
 *   get:
 *     summary: Obtienes todos los permisos.
 *     tags: [permisos]
 *     responses:
 *       200:
 *         description: Devuelve el listado de todos los roles existentes.
 *       500:
 *         description: Error interno del servidor.
 */


router.get("/", getAllPermisos);
export default router;
