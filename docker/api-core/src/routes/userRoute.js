import express from "express";
import dotenv from "dotenv";
import { postUser, getUserByUuid } from '../controller/userController.js' 
const router = express.Router();

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Alejandro
 *               apellido1:
 *                 type: string
 *                 example: Fisac
 *               apellido2:
 *                 type: string
 *                 example: Delgado
 *               correoInstitucional:
 *                 type: string
 *                 example: alejandro.fisac@alumnos.upm.es
 *               usuarioVpn:
 *                 type: string
 *                 example: afisac
 *               gitlab:
 *                 type: string
 *                 example: afisac
 *               profesorResponsable:
 *                 type: integer
 *                 example: 1
 *               fechaIncorporacion:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-16
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 example: 2027-02-16
 *               wifi:
 *                 type: boolean
 *                 example: true
 *               activo:
 *                 type: boolean
 *                 example: true
 *               tarjetaAcceso:
 *                 type: string
 *                 example: A-88923
 *               teams:
 *                 type: boolean
 *                 example: true
 *               jefeLaboratorio:
 *                 type: boolean
 *                 example: false
 *               esResponsable:
 *                 type: boolean
 *                 example: false
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2]
 *               puertasAutorizadas:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1]
 *               duenoMaquina:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor.
 */


router.post("/", postUser);
router.get("/:uuid", getUserByUuid);



export default router;
