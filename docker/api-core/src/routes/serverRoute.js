import express from "express";
import dotenv from "dotenv";
import { postMaquina } from '../controller/serverController.js' 
import { verificarToken, tienePermiso } from '../middlewares/authMiddleware.js';
const router = express.Router();




/**
 * @swagger
 * /api/maquina:
 *   post:
 *     summary: Crear un nuevo servidor
 *     tags: [Servidores, Maquinas]
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
router.post("/", [verificarToken, tienePermiso("maq:postMaquina")],  postMaquina);
export default router;
