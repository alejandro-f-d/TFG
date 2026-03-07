import { QUEUE_DOCUMENTS } from "../eda/constants.js";
import { addPdfToQueue } from "../eda/queue.js";
import PeticionModel from "../models/peticionModel.js";
import axios from "axios";

const tienePermisoVisualizacion = async (userId, peticionUuid, permisos) => {
	if (!userId) return 1; // 403

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(peticionUuid)) return 2;

	if (
		permisos.includes("admin:total") ||
		permisos.includes("peticion:listar_todo")
	) {
		return 0;
	}

	if (permisos.includes("peticion:revisor")) {
		const esSuResponsable = await PeticionModel.verificarPermiso(
			userId,
			peticionUuid,
			true,
		);
		if (esSuResponsable === 0) return 0; // Éxito
		if (esSuResponsable === 2) return 2; // Not found
	}

	const esElCreador = await PeticionModel.verificarPermiso(
		userId,
		peticionUuid,
		false,
	);

	if (esElCreador === 0) return 0;
	if (esElCreador === 2) return 2;

	return 1;
};

export const postPeticion = async (req, res) => {
	const {
		nombreProyectoAsociado,
		servidorAsociado,
		tareasServidor,
		prioridadTarea,
		momentoEjecucion,
		nombreServicioAsociado,
	} = req.body;

	if (
		!nombreProyectoAsociado ||
		!servidorAsociado ||
		!tareasServidor ||
		!prioridadTarea ||
		!momentoEjecucion ||
		!nombreServicioAsociado
	) {
		return res
			.status(400)
			.json({ error: "Petición mal formada. Faltan campos obligatorios." });
	}

	try {
		const datosParaWorker = await PeticionModel.postPeticion(
			req.body,
			req.user?.uuidUsuario,
		);

		if (typeof datosParaWorker === "number") {
			const errores = {
				1: "Usuario solicitante no encontrado.",
				2: "Un responsable/supervisor no puede realizar esta petición.",
				3: "Responsable asociado no encontrado.",
				4: "Momento de ejecución no válido.",
				5: "Prioridad de la tarea no válido.",
			};
			return res
				.status(403)
				.json({ error: errores[datosParaWorker] || "Operación no permitida." });
		}
		console.log(datosParaWorker);

		await addPdfToQueue({
			...datosParaWorker,
			solicitante: datosParaWorker.nombreCompleto,
			email: datosParaWorker.correoInstitucional,
			supervisor: datosParaWorker.nombreSupervisor,
			fecha: datosParaWorker.fechaSolicitud,
			servidores: datosParaWorker.servidoresNombres,
			proyecto: datosParaWorker.nombreProyectoAsociado,

			recursos: {
				cpu: datosParaWorker.cpuSolicitada,
				ram: datosParaWorker.ram,
				disco: datosParaWorker.disco,
				gpu: datosParaWorker.gpuSolicitada,
			},

			tareas: datosParaWorker.tareasServidor,
			docker: datosParaWorker.docker,
			finNecesidadServicio: datosParaWorker.fechaFin,
			prioridadTarea: datosParaWorker.prioridadTarea,
			momentoEjecucion: datosParaWorker.momentoEjecucion,
			idPeticion: datosParaWorker.idPeticion,
			uuid: datosParaWorker.uuid,
			linkPeticion: `${process.env.WEB_URL}${datosParaWorker.uuid}`,
		});

		return res.status(201).json({
			message:
				"Petición registrada correctamente. El documento PDF se está generando.",
			uuidPeticion: datosParaWorker.uuidPeticion,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer post para una petición.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getPeticion = async (req, res) => {
	const { uuid } = req.params;
	try {
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1)
			return res.status(403).json({ error: "No tienes permiso" });
		if (codigoPermiso === 2)
			return res.status(404).json({ error: "Petición no encontrada" });

		const resGetPeticion = await PeticionModel.getPeticionByUuid(uuid);
		if (resGetPeticion === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}
		return res.status(200).json({
			message: "Petición encontrada con éxito.",
			info: resGetPeticion,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al intentar obtener los datos de una petición.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getDocumentoPeticion = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Solicitud mal formada." });
	}
	try {
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1)
			return res.status(403).json({ error: "No tienes permiso" });
		if (codigoPermiso === 2)
			return res.status(404).json({ error: "Petición no encontrada" });

		const resGetUuidDoc = await PeticionModel.getUuidDoc(uuid);
		if (resGetUuidDoc === 2) {
			return res.status(404).json({ error: `Documento no encontrado.` });
		}
		console.log("El uuid del documento es:", resGetUuidDoc.uuidDocumento);
		const respuestaStorage = await axios.get(
			`${process.env.STORAGE_URL}/download/${resGetUuidDoc.uuidDocumento}`,
			{
				responseType: "arraybuffer",
			},
		);
		// Establecemos que el tipo que se devuelve es un documento pdf.
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${resGetUuidDoc.nombre}.pdf"`,
		);
		res.send(respuestaStorage.data);
	} catch (error) {
		console.error(
			"Se ha producido un error al intentar realizar un get de la documentación.",
			error,
		);
		if (error.response?.status === 404) {
			return res
				.status(404)
				.json({ message: "El archivo no existe en Storage" });
		}
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getAllPeticiones = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	const status = req.query.status || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}

	try {
		let resultado;
		if (
			req.user.permisos.includes("admin:total") ||
			req.user.permisos.includes("peticion:listar_todo")
		) {
			resultado = await PeticionModel.getAllPeticiones(
				page,
				limit,
				filtroNombre,
				status,
				true,
				null,
			);
		} else if (req.user.permisos.includes("peticion:revisor")) {
			resultado = await PeticionModel.getAllPeticiones(
				page,
				limit,
				filtroNombre,
				status,
				false,
				req.user.idUsuario,
			);
		} else {
			return res
				.status(403)
				.json({ error: "No tienes los permisos necesarios." });
		}
		if (resultado.totalItems === 0) {
			return res.status(400).json({
				message: `No se han encontrado usuarios que coincidan con: ${filtroNombre}`,
			});
		}
		return res.status(200).json({
			message: "Lista de proyectos de gitlab devuelta correctamente.",
			info: resultado,
			pagination: resultado.pagination,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener el listado de todas las peticiones",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
