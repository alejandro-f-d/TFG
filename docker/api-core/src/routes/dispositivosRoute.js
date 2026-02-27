import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postDispositivo } from "../controller/dispositivosController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { dispositivoSchema } from "../schemas/index.js";

const router = express.Router();

/**
 * @swagger
 * /api/dispositivos:
 *   post:
 *     summary: Crea un nuevo dispositivo
 *     description: |
 *       Registra un dispositivo en el sistema.
 *       Se genera automáticamente un UUID único para el dispositivo.
 *       Los campos obligatorios son `nombre` e `idTipoDispositivo`.
 *     tags: [Dispositivos]
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
 *               - nombre
 *               - idTipoDispositivo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del dispositivo
 *                 example: "Disco SSD 1TB"
 *                 minLength: 1
 *               idTipoDispositivo:
 *                 type: integer
 *                 description: ID del tipo de dispositivo (clave foránea)
 *                 example: 3
 *               puntoMontaje:
 *                 type: string
 *                 description: Punto de montaje del dispositivo (ej. /dev/sda1)
 *                 example: "/dev/sda1"
 *               capacidad:
 *                 type: integer
 *                 description: Capacidad total del dispositivo (en GB)
 *                 example: 1024
 *               capacidadUsada:
 *                 type: integer
 *                 description: Capacidad utilizada del dispositivo (en GB)
 *                 example: 512
 *               tecnologia:
 *                 type: string
 *                 description: Tecnología del dispositivo (ej. SSD, HDD, NVMe)
 *                 example: "SSD"
 *               idMaquina:
 *                 type: integer
 *                 description: ID de la máquina a la que está asociado el dispositivo
 *                 example: 5
 *           examples:
 *             ejemploCompleto:
 *               summary: Dispositivo con todos los campos
 *               value:
 *                 nombre: "Disco NVMe 512GB"
 *                 idTipoDispositivo: 2
 *                 puntoMontaje: "/dev/nvme0n1"
 *                 capacidad: 512
 *                 capacidadUsada: 200
 *                 tecnologia: "NVMe"
 *                 idMaquina: 1
 *             ejemploMinimo:
 *               summary: Solo campos obligatorios
 *               value:
 *                 nombre: "Disco SSD 256GB"
 *                 idTipoDispositivo: 3
 *     responses:
 *       201:
 *         description: Dispositivo creado exitosamente
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL relativa del recurso creado
 *             example: "/api/dispositivos/123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dispositivo creado con éxito."
 *                 uuid:
 *                   type: string
 *                   format: uuid
 *                   description: UUID único del dispositivo creado
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL completa del recurso creado
 *                   example: "https://api.ejemplo.com/api/dispositivos/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Error de validación - Petición mal formada (faltan campos obligatorios o datos inválidos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan nombre o idTipoDispositivo
 *                 value:
 *                   error: "Petición mal formada"
 *               validacionJoi:
 *                 summary: Error de validación de esquema
 *                 value:
 *                   error: "nombre es requerido, idTipoDispositivo debe ser un número"
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
 *         description: Prohibido - No tiene el permiso requerido
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

router.post(
	"/",
	[
		verificarToken,
		tienePermiso("dispositivo:postDispositivo"),
		validarTipos(dispositivoSchema),
	],
	postDispositivo,
);

export default router;
