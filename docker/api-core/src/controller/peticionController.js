import { QUEUE_DOCUMENTS } from "../eda/constants.js";
import { addPdfToQueue } from "../eda/queue.js";
import PeticionModel from "../models/peticionModel.js";

const tienePermisoVisualizacion = async (userId, peticionUuid, permisos) => {
	if (!userId) {
		return 1; // Error 403
	}
	if (
		permisos.includes("admin:total") ||
		permisos.includes("peticion:revisor")
	) {
		return 0;
	}
	const resTienePermiso = await PeticionModel.verificarPermiso(
		userUuid,
		peticionUuid,
	);
	if (!resTienePermiso) {
		return 1; //403
	}
	return 0;
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
		const tienePermisoVer = tienePermisoVisualizacion(
			req.user?.idUsuario,
			uuid,
			req.user?.permisos,
		); // userId, peticionUuid, permisos
		if (tienePermisoVisualizacion === 1) {
			return res.status(403).json({
				error:
					"No tienes las credenciales para ver los datos de esta petición.",
			});
		}
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
