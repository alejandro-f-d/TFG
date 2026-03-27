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
	patchPasswordInterfaz,
} from "../controller/userController.js";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import {
	usuarioSchema,
	maquinaSchema,
	loginSchema,
	usuarioPatchSchema,
	updatePasswordSchema,
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
 *     tags: [Autenticación]
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

// ESTE MÉTODO SIEMPRE ES PÚBLICO.
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
 * /api/user/updatePassword:
 *   patch:
 *     summary: Cambia la contraseña del usuario autenticado
 *     description: |
 *       Permite al usuario autenticado cambiar su propia contraseña.
 *       Requiere proporcionar la contraseña actual y la nueva contraseña.
 *       La nueva contraseña se almacena de forma segura mediante hashing.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordAnterior
 *               - passwordNueva
 *             properties:
 *               passwordAnterior:
 *                 type: string
 *                 format: password
 *                 description: Contraseña actual del usuario
 *                 example: "MiClaveActual123"
 *               passwordNueva:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña deseada
 *                 example: "NuevaClaveSegura456"
 *           examples:
 *             ejemploBasico:
 *               summary: Cambio de contraseña estándar
 *               value:
 *                 passwordAnterior: "contraseñaActual"
 *                 passwordNueva: "nuevaContraseña"
 *     responses:
 *       204:
 *         description: Contraseña actualizada correctamente (sin contenido)
 *       400:
 *         description: Petición mal formada (faltan passwordAnterior o passwordNueva)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición mal formada."
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
 *       404:
 *         description: Usuario no encontrado (si el token corresponde a un usuario que ya no existe)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario no encontrado"
 *       422:
 *         description: La contraseña actual proporcionada no coincide con la almacenada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "La contraseña actual no coincide"
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

router.patch(
	"/updatePassword",
	[verificarToken, validarTipos(updatePasswordSchema)],
	patchPasswordInterfaz,
);

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Crea un nuevo usuario
 *     description: |
 *       Registra un nuevo usuario en el sistema.
 *       Dependiendo del dominio del correo, se trata como usuario institucional (UPM) o externo.
 *       Para usuarios externos la contraseña es obligatoria.
 *       Requiere el permiso `usr:crearUsuario` (o `admin:total`).
 *     tags: [Usuarios]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido1
 *               - roles
 *               - correoInstitucional
 *               - fechaIncorporacion
 *               - activo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del usuario
 *                 example: "Juan"
 *               apellido1:
 *                 type: string
 *                 description: Primer apellido
 *                 example: "Pérez"
 *               apellido2:
 *                 type: string
 *                 description: Segundo apellido (opcional)
 *                 example: "García"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista de IDs de roles a asignar
 *                 example: [1, 3]
 *               correoInstitucional:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico institucional
 *                 example: "juan.perez@upm.es"
 *               usuarioVpn:
 *                 type: string
 *                 description: Nombre de usuario para VPN
 *                 example: "jperez"
 *               gitlab:
 *                 type: string
 *                 description: Usuario de GitLab
 *                 example: "jperez"
 *               puertasAutorizadas:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de puertas a las que tiene acceso
 *                 example: [2, 5]
 *               profesorResponsable:
 *                 type: integer
 *                 description: ID del profesor responsable (si aplica)
 *                 example: 10
 *               fechaIncorporacion:
 *                 type: string
 *                 format: date
 *                 description: Fecha de incorporación
 *                 example: "2025-09-01"
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 description: Fecha de finalización / baja (opcional)
 *                 example: "2026-08-31"
 *               wifi:
 *                 type: boolean
 *                 description: Acceso WiFi concedido
 *                 example: true
 *               activo:
 *                 type: boolean
 *                 description: Estado activo del usuario
 *                 example: true
 *               tarjetaAcceso:
 *                 type: string
 *                 description: Identificador de tarjeta de acceso
 *                 example: "A1B2C3"
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 description: Contraseña (obligatoria para usuarios externos)
 *                 example: "MiClaveSegura2025"
 *               dirIpLastLogin:
 *                 type: string
 *                 description: Última IP conocida
 *                 example: "192.168.1.100"
 *               teams:
 *                 type: boolean
 *                 description: Miembro de equipos específicos
 *                 example: false
 *               duenoMaquina:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de máquinas de las que es propietario
 *                 example: [4, 7]
 *               esResponsable:
 *                 type: boolean
 *                 description: Indica si el usuario tiene rol de responsable
 *                 example: false
 *     responses:
 *       201:
 *         description: Usuario creado con éxito
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/user/550e8400-e29b-41d4-a716-446655440000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario creado con éxito"
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID del usuario creado
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso
 *                   example: "https://api.ejemplo.com/api/user/550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: |
 *           Error de validación. Puede deberse a:
 *           * Faltan parámetros obligatorios (nombre, apellido1, roles, correo, fechaIncorporacion, activo)
 *           * Formato de correo inválido
 *           * Falta contraseña para usuario externo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Faltan parámetros obligatorios."
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
 *         description: Prohibido - No tiene el permiso "usr:crearUsuario"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
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
 *     summary: Obtiene los detalles de un usuario por su UUID
 *     description: |
 *       Retorna la información detallada de un usuario, incluyendo sus relaciones (puertas, máquinas en propiedad, proyectos GitLab, peticiones).
 *       La contraseña nunca se incluye en la respuesta.
 *
 *       **Control de acceso:**
 *       - El propio usuario puede ver su propio perfil (si `uuid` coincide con el del token).
 *       - Usuarios con permiso `usr:getUsuario` (o `admin:total`) pueden ver cualquier usuario.
 *
 *       Si no se cumple ninguna de estas condiciones, se devuelve 403.
 *     tags: [Usuarios]
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del usuario a consultar
 *         example: "f8a6c830-ed1b-44ea-ba72-607a8dcfbc0e"
 *     responses:
 *       200:
 *         description: Usuario encontrado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario encontrado con éxito."
 *                 info:
 *                   type: object
 *                   properties:
 *                     idusuario:
 *                       type: integer
 *                       description: ID interno del usuario
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       description: Nombre del usuario
 *                       example: "Alejandro"
 *                     apellido1:
 *                       type: string
 *                       description: Primer apellido
 *                       example: "Fisac"
 *                     apellido2:
 *                       type: string
 *                       description: Segundo apellido (puede ser nulo)
 *                       example: "Delgado"
 *                     teams:
 *                       type: boolean
 *                       description: Indica si pertenece a equipos
 *                       example: true
 *                     esresponsable:
 *                       type: boolean
 *                       description: Indica si tiene rol de responsable
 *                       example: false
 *                     usuariovpn:
 *                       type: string
 *                       description: Nombre de usuario para VPN
 *                       example: "afisac"
 *                     correoinstitucional:
 *                       type: string
 *                       format: email
 *                       description: Correo electrónico institucional
 *                       example: "alejandro.fisac.contact@gmail.com"
 *                     activo:
 *                       type: boolean
 *                       description: Estado activo del usuario
 *                       example: true
 *                     fechaincorporacion:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha de incorporación
 *                       example: "2026-03-26T00:00:00.000Z"
 *                     fechafin:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Fecha de baja (si aplica)
 *                       example: null
 *                     wifi:
 *                       type: boolean
 *                       description: Acceso WiFi concedido
 *                       example: true
 *                     tarjetaacceso:
 *                       type: string
 *                       description: Identificador de tarjeta de acceso
 *                       example: "0767"
 *                     diriplastlogin:
 *                       type: string
 *                       description: Última dirección IP conocida
 *                       example: "172.20.0.1"
 *                     fotoperfil:
 *                       type: string
 *                       nullable: true
 *                       description: URL o referencia de la foto de perfil
 *                       example: null
 *                     uuidusuario:
 *                       type: string
 *                       format: uuid
 *                       description: UUID del usuario
 *                       example: "f8a6c830-ed1b-44ea-ba72-607a8dcfbc0e"
 *                     gitlab:
 *                       type: string
 *                       description: Usuario de GitLab
 *                       example: "afisac"
 *                     responsable:
 *                       type: integer
 *                       nullable: true
 *                       description: ID del usuario responsable
 *                       example: 2
 *                     peticiones:
 *                       type: array
 *                       description: Peticiones realizadas por el usuario
 *                       items:
 *                         type: object
 *                       example: []
 *                     puertas:
 *                       type: array
 *                       description: Puertas a las que tiene acceso
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nombre:
 *                             type: string
 *                             example: "Puerta CPD"
 *                     maquinas_propiedad:
 *                       type: array
 *                       description: Máquinas de las que es propietario
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nombre:
 *                             type: string
 *                             example: "srv-docker-01"
 *                     proyectos_gitlab:
 *                       type: array
 *                       description: Proyectos GitLab en los que participa
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nombre:
 *                             type: string
 *                             example: "Monitorizacion"
 *                           uuid:
 *                             type: string
 *                             format: uuid
 *                             example: "d5080096-90f1-4cda-8f04-d232e6da1152"
 *                           activo:
 *                             type: boolean
 *                             example: true
 *       400:
 *         description: Falta el UUID en la petición
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falta el uuid."
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
 *         description: Prohibido - El usuario no tiene permiso para ver este perfil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
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
 *                   message: "Usuario no encontrado."
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

router.get("/:uuid", verificarToken, getUserByUuid);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Obtiene listado paginado de usuarios
 *     description: |
 *       Retorna una lista de usuarios con paginación.
 *       Los usuarios incluyen sus relaciones: puertas, máquinas en propiedad, proyectos GitLab y peticiones.
 *       La contraseña nunca se incluye en la respuesta.
 *       Requiere el permiso `usr:getUsuario` (o `admin:total`).
 *     tags: [Usuarios]
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
 *         description: Filtro por nombre (búsqueda parcial en nombre, apellidos)
 *         example: "Alejandro"
 *     responses:
 *       200:
 *         description: Lista de usuarios devuelta correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lista de usuarios devuelta correctamente."
 *                 info:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idusuario:
 *                         type: integer
 *                         description: ID interno del usuario
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         description: Nombre
 *                         example: "Alejandro"
 *                       apellido1:
 *                         type: string
 *                         description: Primer apellido
 *                         example: "Fisac"
 *                       apellido2:
 *                         type: string
 *                         nullable: true
 *                         description: Segundo apellido
 *                         example: "Delgado"
 *                       teams:
 *                         type: boolean
 *                         description: Pertenece a equipos
 *                         example: true
 *                       esresponsable:
 *                         type: boolean
 *                         description: Tiene rol de responsable
 *                         example: false
 *                       usuariovpn:
 *                         type: string
 *                         nullable: true
 *                         description: Usuario VPN
 *                         example: "afisac"
 *                       correoinstitucional:
 *                         type: string
 *                         format: email
 *                         description: Correo institucional
 *                         example: "alejandro.fisac.contact@gmail.com"
 *                       activo:
 *                         type: boolean
 *                         description: Estado activo
 *                         example: true
 *                       fechaincorporacion:
 *                         type: string
 *                         format: date-time
 *                         description: Fecha de incorporación
 *                         example: "2026-03-17T00:00:00.000Z"
 *                       fechafin:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: Fecha de baja
 *                         example: null
 *                       wifi:
 *                         type: boolean
 *                         description: Acceso WiFi
 *                         example: true
 *                       tarjetaacceso:
 *                         type: string
 *                         nullable: true
 *                         description: Tarjeta de acceso
 *                         example: "0767"
 *                       diriplastlogin:
 *                         type: string
 *                         nullable: true
 *                         description: Última IP conocida
 *                         example: "172.20.0.1"
 *                       fotoperfil:
 *                         type: string
 *                         nullable: true
 *                         description: Foto de perfil (URL o referencia)
 *                         example: null
 *                       uuidusuario:
 *                         type: string
 *                         format: uuid
 *                         description: UUID del usuario
 *                         example: "6d8d77f0-d9a5-472b-aec3-92223b6ac70b"
 *                       gitlab:
 *                         type: string
 *                         nullable: true
 *                         description: Usuario GitLab
 *                         example: "afisac"
 *                       responsable:
 *                         type: integer
 *                         nullable: true
 *                         description: ID del usuario responsable
 *                         example: 2
 *                       peticiones:
 *                         type: array
 *                         description: Peticiones realizadas por el usuario
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             uuid:
 *                               type: string
 *                               format: uuid
 *                               example: "a682584b-a138-475d-99ac-3b78565681d9"
 *                             proyecto:
 *                               type: string
 *                               example: "IA-Research"
 *                             estado:
 *                               type: string
 *                               example: "APROBADA"
 *                       puertas:
 *                         type: array
 *                         description: Puertas a las que tiene acceso
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             nombre:
 *                               type: string
 *                               example: "Puerta CPD"
 *                       maquinas_propiedad:
 *                         type: array
 *                         description: Máquinas de las que es propietario
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             nombre:
 *                               type: string
 *                               example: "srv-docker-01"
 *                       proyectos_gitlab:
 *                         type: array
 *                         description: Proyectos GitLab en los que participa
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             nombre:
 *                               type: string
 *                               example: "Monitorizacion"
 *                             uuid:
 *                               type: string
 *                               format: uuid
 *                               example: "4e6353a7-7039-487f-ba38-f2ef986aa4e3"
 *                             activo:
 *                               type: boolean
 *                               example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       description: Número total de usuarios
 *                       example: 3
 *                     totalPages:
 *                       type: integer
 *                       description: Número total de páginas
 *                       example: 1
 *                     currentPage:
 *                       type: integer
 *                       description: Página actual
 *                       example: 1
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
 *         description: Prohibido - No tiene el permiso "usr:getUsuario"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: No se encontraron usuarios con el filtro aplicado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se han encontrado usuarios que coincidan con: nombreFiltro"
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
 *       - wifi, tarjetaacceso, diriplastlogin, contrasena, gitlab, responsable, fotoPerfil
 *
 *       **Relaciones editables solo por administradores/editores:**
 *       - roles: Lista de IDs de roles
 *       - puertasAutorizadas: Lista de IDs de puertas
 *       - duenoMaquina: Lista de IDs de máquinas
 *
 *       **Operaciones especiales:**
 *       - `darBaja=true` (query param): Desactiva el usuario (solo admin/editor)
 *       - Subida de foto de perfil (multipart/form-data)
 *     tags: [Usuarios]
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
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del usuario a actualizar
 *         example: "6d8d77f0-d9a5-472b-aec3-92223b6ac70b"
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
 *                 type: boolean
 *                 description: Equipos/Teams del usuario (solo admin/editor)
 *                 example: true
 *               esresponsable:
 *                 type: boolean
 *                 description: Indica si es responsable (solo admin/editor)
 *                 example: true
 *               usuariovpn:
 *                 type: string
 *                 description: Usuario de VPN (solo admin/editor)
 *                 example: "jperez"
 *               wifi:
 *                 type: boolean
 *                 description: Acceso WiFi (solo admin/editor)
 *                 example: true
 *               tarjetaacceso:
 *                 type: string
 *                 description: Número de tarjeta de acceso (solo admin/editor)
 *                 example: "ABC123456"
 *               diriplastlogin:
 *                 type: string
 *                 description: Última IP conocida (solo admin/editor)
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
 *                   example: "No se han enviado campos a actualizar."
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
