import rateLimit from "express-rate-limit";
import express from "express";
import dotenv from "dotenv";
import {
	postUser,
	getUserByUuid,
	getUsers,
	patchUser,
	login,
	requestPasswordReset,
	patchRecuperarPassword,
} from "../controller/userController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import {
	usuarioSchema,
	maquinaSchema,
	loginSchema,
	usuarioPatchSchema,
} from "../schemas/index.js";
const router = express.Router();

// ESTE MÉTODO SIEMPRE ES PÚBLICO.
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

router.post("/login", validarTipos(loginSchema), login);

const recoveryLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // Bloqueo por ventana de 15 minutos
	max: 5, // Máximo 5 peticiones por IP cada 15 min
	message: {
		error: "Demasiados intentos. Por favor, inténtelo de nuevo en 15 minutos.",
	},
	standardHeaders: true, // Devuelve info en las cabeceras RateLimit-*
	legacyHeaders: false,
});

/**
 * @swagger
 * /api/user/recuperarpassword:
 *   post:
 *     summary: Solicita recuperación de contraseña
 *     description: |
 *       Inicia el proceso de recuperación de contraseña para un usuario.
 *
 *       **Características de seguridad:**
 *       - Limitador de tasa (rate limiting) para prevenir abusos
 *       - Anti-spam: 5 minutos de espera entre solicitudes para el mismo usuario
 *       - Tokens de un solo uso válidos por 1 hora
 *       - Invalidación automática de tokens anteriores
 *       - Mensaje genérico por seguridad (no revela si el correo existe)
 *
 *       **Flujo del proceso:**
 *       1. Validar formato de correo
 *       2. Verificar anti-spam (5 min entre solicitudes)
 *       3. Generar token único y su hash
 *       4. Invalidar tokens anteriores del usuario
 *       5. Guardar nuevo token con expiración de 1 hora
 *       6. Enviar correo con enlace (vía cola de emails)
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correoInstitucional
 *             properties:
 *               correoInstitucional:
 *                 type: string
 *                 format: email
 *                 description: Correo institucional del usuario registrado
 *                 example: "juan.perez@universidad.edu"
 *           examples:
 *             ejemploBasico:
 *               summary: Solicitud de recuperación
 *               value:
 *                 correoInstitucional: "juan.perez@universidad.edu"
 *     responses:
 *       200:
 *         description: Solicitud procesada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "En caso de ser un correo registrado recibirá en su bandeja de entrada el sistema de modificación de password."
 *       400:
 *         description: Error de validación - Correo no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición mal formada."
 *       429:
 *         description: |
 *           Demasiadas solicitudes - Límite anti-spam.
 *           Debes esperar el tiempo indicado antes de solicitar otro enlace.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Debes esperar 3 minutos para solicitar otro enlace."
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

router.post("/recuperarpassword", recoveryLimiter, requestPasswordReset);

/**
 * @swagger
 * /api/user/recuperarpassword:
 *   patch:
 *     summary: Restablece la contraseña usando un token de recuperación
 *     description: |
 *       Permite a un usuario establecer una nueva contraseña utilizando el token
 *       recibido por correo electrónico en el proceso de recuperación.
 *
 *       El token debe ser válido y no haber expirado (válido por 1 hora desde su creación).
 *       Una vez utilizado, el token queda invalidado automáticamente.
 *
 *       La nueva contraseña se almacena hasheada con bcrypt.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - contrasena
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Token de recuperación recibido por correo
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña del usuario
 *                 example: "NuevaContraseñaSegura123!"
 *                 minLength: 8
 *           examples:
 *             ejemploBasico:
 *               summary: Restablecimiento de contraseña
 *               value:
 *                 token: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d"
 *                 contrasena: "MiNuevaPassword2024!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contraseña actualizada con éxito."
 *       400:
 *         description: |
 *           Error de validación. Puede deberse a:
 *           * Token o contraseña no proporcionados
 *           * Token inválido, expirado o ya utilizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan campos requeridos
 *                 value:
 *                   error: "Petición mal formada: falta token o contraseña."
 *               tokenInvalido:
 *                 summary: Token inválido o expirado
 *                 value:
 *                   error: "El enlace es invalido, ha expirado o ha sido usado."
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

router.patch("/recuperarpassword", recoveryLimiter, patchRecuperarPassword);

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
 *       403:
 *         description: Careces de los permisos necesarios.
 *       500:
 *         description: Error interno del servidor.
 */

// router.post("/", postUser);// Esta sería la petición normal sin verificar el token.

// router.post("/", verificarToken, postUser);

router.post(
	"/",
	[
		verificarToken,
		tienePermiso("usr:crearUsuario"),
		validarTipos(usuarioSchema),
	],
	postUser,
);

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
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

router.get(
	"/:uuid",
	[verificarToken, tienePermiso("usr:getUsuario")],
	getUserByUuid,
);

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
 *       403:
 *         description: Careces de los permisos necesarios.
 *       404:
 *         description: Usuario no encontrado con esa información.
 *       500:
 *         description: Error interno del servidor.
 */

router.get("/", [verificarToken, tienePermiso("usr:getUsuario")], getUsers);

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
 *       204:
 *         description: Actualizado con éxito.
 *       403:
 *         description: Careces de los permisos necesarios. 
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

router.patch(
	"/:uuid",
	[verificarToken, validarTipos(usuarioPatchSchema)],
	patchUser,
);

export default router;
