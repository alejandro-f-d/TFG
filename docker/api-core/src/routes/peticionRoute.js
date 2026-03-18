import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import {
	postPeticion,
	getPeticion,
	getDocumentoPeticion,
	getAllPeticiones,
	procesarFirmaPorRol,
	denegarPeticion,
	peticionRealizada,
} from "../controller/peticionController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import {
	denegarPeticionSchema,
	validacionFirmaCompleta,
} from "../schemas/index.js";
const router = express.Router();
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 100 * 1024 * 1024, // Limitamos a 100MB
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("application/pdf")) {
			cb(null, true);
		} else {
			cb(new Error("Solo se permiten pdfs"), false);
		}
	},
});

/**
 * @swagger
 * /api/peticion:
 *   post:
 *     summary: Crea una nueva petición de recursos/servicios
 *     description: |
 *       Permite a un usuario no responsable crear una petición para solicitar recursos (CPU, RAM, GPU, disco)
 *       o servicios asociados a servidores. El proceso incluye:
 *       - Validación de que el usuario no sea responsable (solo usuarios regulares)
 *       - Verificación de existencia del responsable asignado
 *       - Validación de prioridad y momento de ejecución
 *       - Asociación con múltiples servidores
 *       - Generación automática de PDF con los detalles
 *
 *       **Restricciones:**
 *       - Usuarios con rol "responsable" no pueden crear peticiones
 *       - El usuario debe tener un responsable asignado
 *       - Los servidores, prioridad y momento de ejecución deben ser válidos
 *     tags: [Peticiones]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombreProyectoAsociado
 *               - servidorAsociado
 *               - tareasServidor
 *               - prioridadTarea
 *               - momentoEjecucion
 *               - nombreServicioAsociado
 *             properties:
 *               nombreProyectoAsociado:
 *                 type: string
 *                 description: Nombre del proyecto asociado
 *                 example: "Proyecto Migración GPU"
 *               servidorAsociado:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los servidores solicitados
 *                 example: [1, 3, 5]
 *               necesidadServidor:
 *                 type: string
 *                 description: Descripción de la necesidad del servidor
 *                 example: "Se requiere acceso para pruebas de rendimiento"
 *               tareasServidor:
 *                 type: string
 *                 description: Descripción de las tareas a realizar
 *                 example: "Entrenamiento de modelos de deep learning"
 *               cpuSolicitada:
 *                 type: integer
 *                 description: Número de CPUs solicitadas
 *                 example: 8
 *               gpuSolicitada:
 *                 type: integer
 *                 description: Número de GPUs solicitadas
 *                 example: 2
 *               prioridadTarea:
 *                 type: integer
 *                 description: ID de la prioridad
 *                 example: 1
 *               docker:
 *                 type: boolean
 *                 description: Indica si requiere Docker
 *                 example: true
 *               sistemaOperativo:
 *                 type: string
 *                 description: Sistema operativo requerido
 *                 example: "Ubuntu 22.04"
 *               comentariosAdicionales:
 *                 type: string
 *                 description: Comentarios adicionales
 *                 example: "Se necesita acceso root temporal"
 *               tiempoEstimadoTarea:
 *                 type: string
 *                 description: Tiempo estimado para las tareas
 *                 example: "2 semanas"
 *               nombreAccesoNativo:
 *                 type: string
 *                 description: Nombre para acceso nativo
 *                 example: "jperez-ml"
 *               disco:
 *                 type: integer
 *                 description: Espacio en disco requerido (GB)
 *                 example: 500
 *               ram:
 *                 type: integer
 *                 description: Memoria RAM requerida (GB)
 *                 example: 32
 *               momentoEjecucion:
 *                 type: integer
 *                 description: ID del momento de ejecución
 *                 example: 1
 *               nombreServicioAsociado:
 *                 type: string
 *                 description: Nombre del servicio asociado
 *                 example: "Deep Learning Platform"
 *               justificacionAccesoNativo:
 *                 type: string
 *                 description: Justificación para acceso nativo
 *                 example: "Se requiere para instalación de drivers específicos"
 *               fechaFin:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha estimada de finalización
 *                 example: "2026-04-30T23:59:59.999Z"
 *           examples:
 *             ejemploBasico:
 *               summary: Petición básica de recursos
 *               value:
 *                 nombreProyectoAsociado: "Proyecto IA"
 *                 servidorAsociado: [1, 2]
 *                 necesidadServidor: "Acceso para pruebas"
 *                 tareasServidor: "Entrenamiento de modelos"
 *                 cpuSolicitada: 4
 *                 gpuSolicitada: 1
 *                 prioridadTarea: 1
 *                 docker: true
 *                 sistemaOperativo: "Ubuntu 20.04"
 *                 comentariosAdicionales: "Necesito permisos de sudo"
 *                 tiempoEstimadoTarea: "1 mes"
 *                 nombreAccesoNativo: "jperez-ai"
 *                 disco: 200
 *                 ram: 16
 *                 momentoEjecucion: 1
 *                 nombreServicioAsociado: "AI Platform"
 *                 justificacionAccesoNativo: "Configuración de entornos"
 *                 fechaFin: "2026-04-30T23:59:59.999Z"
 *     responses:
 *       201:
 *         description: Petición creada exitosamente (el PDF se generará en segundo plano)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Petición registrada correctamente. El documento PDF se está generando."
 *                 uuidPeticion:
 *                   type: string
 *                   format: uuid
 *                   description: UUID de la petición creada
 *                   example: "9b5fe2b7-5f2a-4d9f-8585-3f0fca41e95d"
 *       400:
 *         description: Error de validación - Campos obligatorios faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición mal formada. Faltan campos obligatorios."
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
 *           Operación no permitida. Puede deberse a:
 *           * Usuario responsable no puede crear peticiones
 *           * Usuario no encontrado
 *           * Responsable asociado no encontrado
 *           * Prioridad o momento de ejecución inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               usuarioNoEncontrado:
 *                 summary: Usuario no encontrado
 *                 value:
 *                   error: "Usuario solicitante no encontrado."
 *               esResponsable:
 *                 summary: Usuario es responsable
 *                 value:
 *                   error: "Un responsable/supervisor no puede realizar esta petición."
 *               responsableNoEncontrado:
 *                 summary: Responsable no encontrado
 *                 value:
 *                   error: "Responsable asociado no encontrado."
 *               momentoInvalido:
 *                 summary: Momento de ejecución inválido
 *                 value:
 *                   error: "Momento de ejecución no válido."
 *               prioridadInvalida:
 *                 summary: Prioridad inválida
 *                 value:
 *                   error: "Prioridad de la tarea no válido."
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

router.post("/", [verificarToken], postPeticion);

/**
 * @swagger
 * /api/peticion/{uuid}:
 *   get:
 *     summary: Obtiene los detalles de una petición específica
 *     description: Retorna la información detallada de una petición de recursos/servicios
 *     tags: [Peticiones]
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
 *         description: UUID de la petición a consultar
 *         example: "4e015f25-2c2e-4292-ac57-43218a969f97"
 *     responses:
 *       200:
 *         description: Petición encontrada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Petición encontrada con éxito."
 *                 info:
 *                   type: object
 *                   properties:
 *                     idpeticion:
 *                       type: integer
 *                       example: 1
 *                     uuidpeticion:
 *                       type: string
 *                       format: uuid
 *                       example: "4e015f25-2c2e-4292-ac57-43218a969f97"
 *                     fechacreacion:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-06T20:43:01.992Z"
 *                     fechafin:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     estado:
 *                       type: string
 *                       example: "APROBADA"
 *                     usuariopeticion:
 *                       type: integer
 *                       example: 2
 *                     uuiddocumento:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     usuariosupervisor:
 *                       type: integer
 *                       example: 1
 *                     idpetacceso:
 *                       type: integer
 *                       example: 1
 *                     cpusolicitada:
 *                       type: string
 *                       example: "8"
 *                     gpusolicitada:
 *                       type: string
 *                       example: "1"
 *                     nombreproyectoasociado:
 *                       type: string
 *                       example: "IA-Research"
 *                     nombreservicioasociado:
 *                       type: string
 *                       example: "Servicio-IA"
 *                     prioridadtarea:
 *                       type: integer
 *                       example: 1
 *                     docker:
 *                       type: string
 *                       example: "docker:latest"
 *                     sistemaoperativo:
 *                       type: string
 *                       example: "Ubuntu 22.04"
 *                     comentariosadicionales:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     tiempoestimadotarea:
 *                       type: string
 *                       example: "48"
 *                     aceptatos:
 *                       type: boolean
 *                       example: true
 *                     nombreaccesonativo:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     disco:
 *                       type: string
 *                       example: "500"
 *                     justificacionaccesonativo:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     ram:
 *                       type: string
 *                       example: "32"
 *                     idpeticionreferencia:
 *                       type: integer
 *                       example: 1
 *                     idmomentoejecucion:
 *                       type: integer
 *                       example: 1
 *                     prioridad_nombre:
 *                       type: string
 *                       example: "INMEDIATO"
 *                     momento_ejecucion_nombre:
 *                       type: string
 *                       example: "mañanas"
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
 *         description: No tiene permisos para ver esta petición
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes las credenciales para ver los datos de esta petición."
 *       404:
 *         description: Petición no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición no encontrada."
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

router.get("/:uuid", [verificarToken], getPeticion);

/**
 * @swagger
 * /api/peticion/{uuid}/file:
 *   get:
 *     summary: Obtiene el documento PDF de una petición
 *     description: Retorna el archivo PDF asociado a una petición específica
 *     tags: [Peticiones]
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
 *         description: UUID de la petición
 *         example: "4e015f25-2c2e-4292-ac57-43218a969f97"
 *     responses:
 *       200:
 *         description: Archivo PDF encontrado y devuelto correctamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Solicitud mal formada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Solicitud mal formada."
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
 *         description: No tiene permisos para ver esta petición
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes las credenciales para ver los datos de esta petición."
 *       404:
 *         description: |
 *           Puede deberse a:
 *           * Documento no encontrado en la base de datos
 *           * Archivo no existe en el almacenamiento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Documento no encontrado."
 *                 message:
 *                   type: string
 *                   example: "El archivo no existe en Storage"
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

router.get("/:uuid/file", [verificarToken], getDocumentoPeticion);

/**
 * @swagger
 * /api/peticion:
 *   get:
 *     summary: Obtiene listado paginado de peticiones
 *     description: |
 *       Retorna un listado de peticiones con paginación y filtros.
 *
 *       **Permisos requeridos:**
 *       - admin:total o peticion:listar_todo → Ve todas las peticiones
 *       - peticion:revisor → Ve solo las peticiones que le corresponden
 *     tags: [Peticiones]
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
 *         example: 10
 *       - in: query
 *         name: filtroNombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre de proyecto
 *         example: "IA"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtro por estado (PENDIENTE, APROBADA, RECHAZADA, COMPLETADA)
 *         example: "APROBADA"
 *     responses:
 *       200:
 *         description: Listado obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lista de proyectos de gitlab devuelta correctamente."
 *                 info:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     rows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           idpeticion:
 *                             type: integer
 *                             example: 1
 *                           uuidpeticion:
 *                             type: string
 *                             format: uuid
 *                             example: "481bd62e-8d11-40fc-94bb-64e3309ab4af"
 *                           fechacreacion:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-03-07T18:35:52.620Z"
 *                           fechafin:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           estado:
 *                             type: string
 *                             example: "APROBADA"
 *                           usuariopeticion:
 *                             type: integer
 *                             example: 2
 *                           uuiddocumento:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           usuariosupervisor:
 *                             type: integer
 *                             example: 1
 *                           idpetacceso:
 *                             type: integer
 *                             example: 1
 *                           cpusolicitada:
 *                             type: string
 *                             example: "8"
 *                           gpusolicitada:
 *                             type: string
 *                             example: "1"
 *                           nombreproyectoasociado:
 *                             type: string
 *                             example: "IA-Research"
 *                           nombreservicioasociado:
 *                             type: string
 *                             example: "Servicio-IA"
 *                           prioridadtarea:
 *                             type: integer
 *                             example: 1
 *                           docker:
 *                             type: string
 *                             example: "docker:latest"
 *                           sistemaoperativo:
 *                             type: string
 *                             example: "Ubuntu 22.04"
 *                           comentariosadicionales:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           tiempoestimadotarea:
 *                             type: string
 *                             example: "48"
 *                           aceptatos:
 *                             type: boolean
 *                             example: true
 *                           nombreaccesonativo:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           disco:
 *                             type: string
 *                             example: "500"
 *                           justificacionaccesonativo:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           ram:
 *                             type: string
 *                             example: "32"
 *                           idpeticionreferencia:
 *                             type: integer
 *                             example: 1
 *                           idmomentoejecucion:
 *                             type: integer
 *                             example: 1
 *                           prioridad_nombre:
 *                             type: string
 *                             example: "INMEDIATO"
 *                           momento_ejecucion_nombre:
 *                             type: string
 *                             example: "mañanas"
 *                           nombre_creador:
 *                             type: string
 *                             example: "test test test"
 *                           nombre_supervisor:
 *                             type: string
 *                             example: "  "
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 5
 *       400:
 *         description: Parámetros inválidos o sin resultados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición invalida"
 *                 message:
 *                   type: string
 *                   example: "No se han encontrado usuarios que coincidan con: IA"
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
 *         description: No tiene los permisos necesarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes los permisos necesarios."
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

router.get("/", [verificarToken], getAllPeticiones);

/**
 * @swagger
 * /api/peticion/{uuid}/firma:
 *   post:
 *     summary: Procesa la firma electrónica de un documento de petición
 *     description: |
 *       Endpoint para subir y validar un documento PDF firmado electrónicamente.
 *       La validación se realiza mediante un servicio DSS (Digital Signature Service).
 *
 *       **Niveles de firma según rol:**
 *       - **Nivel 1 (Solicitante)**: Usuario creador de la petición
 *       - **Nivel 2 (Revisor)**: Supervisor/encargado de la petición
 *       - **Nivel 3 (Administrador)**: Admin o firma_administrador
 *
 *       **Flujo:**
 *       1. Verifica permisos según el rol del usuario
 *       2. Valida la integridad de la firma electrónica
 *       3. Si es válida, actualiza el documento en Storage
 *       4. Registra el nivel de firma completado
 *       5. Envía notificaciones por correo según el nivel
 *     tags: [Peticiones]
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
 *         description: UUID de la petición
 *         example: "481bd62e-8d11-40fc-94bb-64e3309ab4af"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documentoPdf
 *             properties:
 *               documentoPdf:
 *                 type: string
 *                 format: binary
 *                 description: Archivo PDF con la firma electrónica
 *     responses:
 *       201:
 *         description: Documento validado y firma procesada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Documento íntegro y firma válida"
 *                 metadatos:
 *                   type: object
 *                   description: Metadatos de la validación de firma
 *       304:
 *         description: La petición ya se encuentra en estado "DENEGADA", luego no se pueden realizar más firmas.
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               uuidFaltante:
 *                 value:
 *                   error: "Petición mal formada."
 *               uuidInvalido:
 *                 value:
 *                   error: "UUID de la petición en formato inválido."
 *               sinArchivo:
 *                 value:
 *                   error: "No se ha recibido el PDF en 'documentoPdf'."
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
 *         description: No tiene permisos para firmar esta petición
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes los permisos necesarios o ya has realizado la firma."
 *       404:
 *         description: Petición no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición no encontrada."
 *       422:
 *         description: La validación de la firma ha fallado o el CN del certificado del servidor no es válido o la integridad se ha visto alterada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "La validación de la firma no ha podido completarse satisfactoriamente."
 *                 motivo:
 *                   type: string
 *                   example: "Firma no válida"
 *                 metadatos:
 *                   type: object
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno al procesar la firma electrónica."
 *                 detalle:
 *                   type: string
 */

router.post(
	"/:uuid/firma",
	[
		verificarToken,
		upload.single("documentoPdf"),
		validarTipos(validacionFirmaCompleta),
	],
	procesarFirmaPorRol,
);

/**
 * @swagger
 * /api/peticion/{uuid}/denegar:
 *   patch:
 *     summary: Deniega una petición
 *     description: |
 *       Permite denegar una petición de recursos/servicios.
 *
 *       **Permisos requeridos:**
 *       - admin:total
 *       - peticion:firma_administrador
 *       - peticion:revisor
 *
 *       **Validaciones:**
 *       - La petición debe existir
 *       - La petición no debe estar ya denegada
 *
 *       **Comportamiento:**
 *       - Cambia el estado de la petición a "DENEGADA"
 *       - Guarda la razón de denegación
 *       - Envía notificaciones por correo:
 *         * Si es Admin: Notifica al creador y al supervisor
 *         * Si es Revisor: Notifica solo al creador
 *     tags: [Peticiones]
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
 *         description: UUID de la petición a denegar
 *         example: "481bd62e-8d11-40fc-94bb-64e3309ab4af"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razonDenegada
 *             properties:
 *               razonDenegada:
 *                 type: string
 *                 description: Motivo por el cual se deniega la petición
 *                 example: "Recursos insuficientes en el cluster solicitado"
 *           examples:
 *             ejemploBasico:
 *               value:
 *                 razonDenegada: "No hay disponibilidad de GPU en las fechas solicitadas"
 *     responses:
 *       204:
 *         description: Petición denegada correctamente
 *       304:
 *         description: La petición ya se encuentra denegada (no modificada)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "La petición ya se encuentra denegada."
 *       400:
 *         description: Error de validación - Razón no proporcionada
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
 *       403:
 *         description: |
 *           No tiene permisos para denegar la petición.
 *           Puede deberse a:
 *           * No tiene el rol adecuado (admin, firma_administrador, revisor)
 *           * No tiene relación con la petición (solo puede denegar el supervisor asignado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tienes permiso para denegar una petición."
 *       404:
 *         description: Petición no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición no encontrada."
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
	"/:uuid/denegar",
	[verificarToken, validarTipos(denegarPeticionSchema)],
	denegarPeticion,
);

/**
 * @swagger
 * /api/peticion/{uuid}/completada:
 *   patch:
 *     summary: Marca una petición como realizada/completada
 *     description: |
 *       Cambia el estado de una petición a "REALIZADA" (completada).
 *       Solo los usuarios con permiso `admin:total` pueden ejecutar esta acción.
 *
 *       **Validaciones:**
 *       - La petición debe existir
 *       - La petición no debe estar en estado "DENEGADA"
 *     tags: [Peticiones]
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
 *         description: UUID de la petición a marcar como completada
 *         example: "481bd62e-8d11-40fc-94bb-64e3309ab4af"
 *     responses:
 *       204:
 *         description: Petición marcada como REALIZADA correctamente (sin contenido)
 *       304:
 *         description: La petición ya se encuentra denegada, no se puede marcar como completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "La petición ya se encuentra denegada."
 *       400:
 *         description: Petición mal formada (UUID no proporcionado)
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
 *       403:
 *         description: Prohibido - No tiene el permiso "admin:total"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para realizar esta acción"
 *       404:
 *         description: Petición no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Petición no encontrada."
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
	"/:uuid/completada",
	[verificarToken, tienePermiso("admin:total")],
	peticionRealizada,
);
export default router;
