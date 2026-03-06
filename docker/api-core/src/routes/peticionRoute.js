import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postPeticion, getPeticion } from "../controller/peticionController.js";
const router = express.Router();
/**
 * @swagger
 * /api/peticiones:
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
 * /api/peticiones/{uuid}:
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

export default router;
