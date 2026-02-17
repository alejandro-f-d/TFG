import express from "express";
const router = express.Router();
import { getAllPermisos } from '../controller/permisosController.js'
import { verificarToken, tienePermiso } from '../middlewares/authMiddleware.js';



/**
 * @swagger
 * /api/permisos:
 *   get:
 *     summary: Obtienes todos los permisos.
 *     tags: [permisos]
 *     responses:
 *       200:
 *         description: Devuelve el listado de todos los roles existentes.
 *       403:
 *         description: Careces de los permisos necesarios.
 *       500:
 *         description: Error interno del servidor.
 */


router.get("/", [verificarToken, tienePermiso("perm:listarPermisos")] , getAllPermisos);
export default router;
