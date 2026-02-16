import express from "express";
import dotenv from "dotenv";
import { postUser, getUserByUuid, getUsers, patchUser, login } from '../controller/userController.js' 
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

/**
 * @swagger
 * /api/user/{uuid}:
 *   get:
 *     summary: Obtienes un usuario por uuid.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del usuario
 *         example: 178529fe-3c6b-4a50-b318-9d9f01ae0054
 *     responses:
 *       200:
 *         description: Información del usuario encontrada correctamente.
 *       400:
 *         description: Error en los datos enviados.
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

router.get("/:uuid", getUserByUuid);



/**
 * @swagger
 * /api/user/:
 *   get:
 *     summary: Obtienes la lista de todos los usuarios.
 *     tags: [User]
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
 *       404:
 *         description: Usuario no encontrado con esa información.
 *       500:
 *         description: Error interno del servidor.
 */


router.get("/", getUsers);

/**
 * @swagger
 * /api/user/{uuid}:
 *   patch:
 *     summary: Actualiza parcialmente un usuario.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del usuario.
 *       - name: darBaja 
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean

 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               nombre: "Alejandro Modificado"
 *               activo: false
 *     responses:
 *       200:
 *         description: Actualizado con éxito.
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

router.patch('/:uuid', patchUser);

/**
  * @swagger
  * /api/user/login:
  *   post:
  *     summary: Obtienes un token de dos horas de duración para interactuar con el sistema.
  *     tags: [User]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               correoInstitucional:
  *                 type: string
  *                 example: alejandro.fisac.contact@gmail.com
  *               contrasena:
  *                 type: string
  *                 example: password
  *     responses:
  *       200:
  *         description: Devuelve el token de acceso debido a un login correcto.
  *       401:
  *         description: Error en la identificación.
  *       500:
  *         description: Error interno del servidor.
*/


router.post('/login', login);

export default router;
