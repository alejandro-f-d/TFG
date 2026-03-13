import MonitorModel from "../models/monitorModel.js";

export const postMonitor = async (req, res) => {
	const { nombreObjetivo, direccion } = req.body;
	if (!nombreObjetivo || !direccion) {
		return res
			.status(400)
			.json({ error: "Petición mal formada para la creación del monitoreo." });
	}
	try {
		const resPost = await MonitorModel.postMonitor(
			req.user.idUsuario,
			req.body,
		);
		return res
			.status(201)
			.location(resPost.uuid)
			.json({
				message: "Proceso de monitoreo creado con éxito.",
				uuid: resPost.uuid,
				url: `${process.env.API_DIRECTION}/api/monitor/${resPost.uuid}`,
			});
	} catch (error) {
		console.error(
			"Se ha producido un error al realizar el post de un monitoreo.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};
export const getMonitorByUuid = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	try {
		if (
			!req.user.permisos.includes("monitor:listar") &&
			!req.user.permisos.includes("admin:total")
		) {
			// Opción de que sea el dueño del monitor.
			const esDueno = MonitorModel.verificardueno(uuid, req.user.idUsuario);
			if (!esDueno || esDueno === 2) {
				return res
					.status(403)
					.json({ error: "No tienes acceso a ese monitor." });
			}
		}
		const resultado = await MonitorModel.getMonitorByUuid(uuid);
		if (resultado === 2) {
			return res.status(404).json({ error: "Monitor no encontrado." });
		}

		return res
			.status(200)
			.json({ message: "Monitor encontrado con éxito", info: resultado });
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el get de un monitor por uuid.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
