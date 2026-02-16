import express from "express";
import dotenv from "dotenv";
import { postUser } from '../controller/userController.js' 
const router = express.Router();

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Creación de un usuario con sus datos asociados.
 *     description: Crea un usuario en el sistema con toda la información proporcionada y retorna la URI del recurso creado.
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Alejandro"
 *               apellido1:
 *                 type: string
 *                 example: "Fisac"
 *               apellido2:
 *                 type: string
 *                 nullable: true
 *                 example: "Delgado"
 *               teams:
 *                 type: boolean
 *                 example: true
 *               esResponsable:
 *                 type: boolean
 *                 example: false
 *               usuarioVpn:
 *                 type: string
 *                 nullable: true
 *                 example: "afisac"
 *               correoInstitucional:
 *                 type: string
 *                 format: email
 *                 example: "alejandro.fisac@alumnos.upm.es"
 *               activo:
 *                 type: boolean
 *                 example: true
 *               fechaIncorporacion:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-12"
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: null
 *               wifi:
 *                 type: boolean
 *                 example: true
 *               tarjetaAcceso:
 *                 type: string
 *                 nullable: true
 *                 example: "TA-93284"
 *               gitlab:
 *                 type: string
 *                 nullable: true
 *                 example: "afisac"
 *               profesorResponsable:
 *                 type: string
 *                 nullable: true
 *                 example: "Ernestina Menasalvas"
 *               jefeLaboratorio:
 *                 type: boolean
 *                 example: false
 *               password:
 *                 type: string
 *                 description: Contraseña en texto plano (será hasheada por el backend).
 *                 example: "MiContraseñaSegura123"
 *             required:
 *               - nombre
 *               - apellido1
 *               - correoInstitucional
 *               - activo
 *               - fechaIncorporacion
 *               - password
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 location:
 *                   type: string
 *                   format: uuid
 *                   example: "f317fd34-5342-498b-b383-0cdab8d1ff8a"
 *       500:
 *         description: Error interno del servidor.
 */


router.post("/", postUser);


export default router;
