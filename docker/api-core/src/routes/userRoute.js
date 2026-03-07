import rateLimit from "express-rate-limit";
import express from "express";
import dotenv from "dotenv";
import multer from "multer";
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
const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 2 * 1024 * 1024, // Limitamos a 2MB para no saturar la DB
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Solo se permiten imágenes"), false);
		}
	},
});

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
 *     summary: Actualiza parcialmente un usuario
 *     description: |
 *       Permite modificar los datos de un usuario existente.
 *       **Permisos requeridos:**
 *       - Admin total (`admin:total`)
 *       - Editor de usuarios (`usr:editUsuario`)
 *       - O el propio usuario (solo puede editar campos básicos)
 *
 *       **Campos editables por el propio usuario:**
 *       - nombre, apellido1, apellido2, fotoPerfil
 *
 *       **Campos editables por administradores/editores (todos los anteriores más):**
 *       - teams, esresponsable, usuariovpn, correoinstitucional, activo, fechafin
 *       - wifi, tarjetaacceso, diriplastlogin, contrasena, gitlab, responsable
 *
 *       **Relaciones editables solo por administradores/editores:**
 *       - roles: Lista de IDs de roles
 *       - puertasAutorizadas: Lista de IDs de puertas
 *       - duenoMaquina: Lista de IDs de máquinas
 *
 *       **Operaciones especiales:**
 *       - `darBaja=true` (query param): Desactiva el usuario (solo admin/editor)
 *       - Subida de foto de perfil (multipart/form-data)
 *     tags: [User]
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 *         description: UUID del usuario a actualizar
 *         example: "3dcb7dc3-6742-4609-95f6-9594e4e7927e"
 *       - in: query
 *         name: darBaja
 *         schema:
 *           type: boolean
 *           enum: [true]
 *         description: Si es true, da de baja al usuario (desactiva su cuenta)
 *         example: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del usuario
 *                 example: "Juan Carlos"
 *               apellido1:
 *                 type: string
 *                 description: Primer apellido
 *                 example: "Pérez"
 *               apellido2:
 *                 type: string
 *                 description: Segundo apellido
 *                 example: "García"
 *               correoinstitucional:
 *                 type: string
 *                 format: email
 *                 description: Correo institucional (solo admin/editor)
 *                 example: "juan.perez@universidad.edu"
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña (se hashea automáticamente)
 *                 example: "nuevaContraseña123"
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del usuario (solo admin/editor)
 *                 example: true
 *               fechafin:
 *                 type: string
 *                 format: date
 *                 description: Fecha de baja/expiración (solo admin/editor)
 *                 example: "2026-12-31"
 *               teams:
 *                 type: string
 *                 description: Equipos/Teams del usuario (solo admin/editor)
 *                 example: "Desarrollo,Investigación"
 *               esresponsable:
 *                 type: boolean
 *                 description: Indica si es responsable (solo admin/editor)
 *                 example: true
 *               usuariovpn:
 *                 type: string
 *                 description: Usuario de VPN (solo admin/editor)
 *                 example: "jperez"
 *               wifi:
 *                 type: string
 *                 description: Credenciales WiFi (solo admin/editor)
 *                 example: "eduroam"
 *               tarjetaacceso:
 *                 type: string
 *                 description: Número de tarjeta de acceso (solo admin/editor)
 *                 example: "ABC123456"
 *               diriplastlogin:
 *                 type: string
 *                 description: Directorio/IP last login (solo admin/editor)
 *                 example: "192.168.1.100"
 *               gitlab:
 *                 type: string
 *                 description: Usuario de GitLab (solo admin/editor)
 *                 example: "jperez"
 *               responsable:
 *                 type: integer
 *                 description: ID del responsable (solo admin/editor)
 *                 example: 5
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista de IDs de roles a asignar (solo admin/editor)
 *                 example: [1, 3, 5]
 *               puertasAutorizadas:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista de IDs de puertas autorizadas (solo admin/editor)
 *                 example: [2, 4, 7]
 *               duenoMaquina:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista de IDs de máquinas propietarias (solo admin/editor)
 *                 example: [10, 12]
 *               fotoFile:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen para la foto de perfil
 *     responses:
 *       204:
 *         description: Usuario actualizado exitosamente (sin contenido)
 *       400:
 *         description: |
 *           Error de validación. Puede deberse a:
 *           * No se enviaron campos a actualizar
 *           * Datos inválidos según el esquema de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposVacios:
 *                 summary: Sin campos a actualizar
 *                 value:
 *                   error: "No se han enviado campos a actualizar."
 *               validacionJoi:
 *                 summary: Error de validación de esquema
 *                 value:
 *                   error: "correoinstitucional debe ser un email válido"
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
 *         description: |
 *           Prohibido - No tiene permisos suficientes para realizar la operación.
 *           Puede deberse a:
 *           * Intentar editar un usuario sin ser admin/editor/propietario
 *           * Intentar modificar campos restringidos siendo el propio usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Careces de los permisos necesarios"
 *       404:
 *         description: |
 *           Usuario no encontrado. Puede deberse a:
 *           * Formato de UUID inválido
 *           * UUID no existente en la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               formatoInvalido:
 *                 summary: UUID con formato incorrecto
 *                 value:
 *                   error: "User no encontrado (Formato de ID inválido)."
 *               noExiste:
 *                 summary: UUID válido pero no existe
 *                 value:
 *                   error: "Usuario no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error en el servidor."
 */

router.patch(
	"/:uuid",
	[verificarToken, validarTipos(usuarioPatchSchema), upload.single("fotoFile")],
	patchUser,
);

export default router;
