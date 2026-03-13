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
				url: `${process.env.API_DIRECTION}/api/monitoreo/${resPost.uuid}`,
			});
	} catch (error) {
		console.error(
			"Se ha producido un error al realizar el post de un monitoreo.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};
