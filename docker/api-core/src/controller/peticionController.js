import { QUEUE_DOCUMENTS } from "../eda/constants.js";
import { addPdfToQueue } from "../eda/queue.js";
import PeticionModel from "../models/peticionModel.js";

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
				4: "Error al crear la cabecera de la petición.",
			};
			return res
				.status(403)
				.json({ error: errores[datosParaWorker] || "Operación no permitida." });
		}

		await addPdfToQueue({
			...datosParaWorker,
			solicitante: datosParaWorker.nombreCompleto,
			email: datosParaWorker.correoInstitucional,
			supervisor: datosParaWorker.nombreSupervisor,
			fecha: datosParaWorker.fechaSolicitud,
			servidores: datosParaWorker.servidoresNombres,
			proyecto: datosParaWorker.nombreProyectoAsociado,

			recursos: {
				cpu: datosParaWorker.cpusolicitada,
				ram: datosParaWorker.ram,
				disco: datosParaWorker.disco,
				gpu: datosParaWorker.gpusolicitada,
			},

			tareas: datosParaWorker.tareasServidor,
			docker: datosParaWorker.docker,
			prioridad: datosParaWorker.prioridadtarea,
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
