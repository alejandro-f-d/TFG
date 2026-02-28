import CalendarioModel from "../models/calendarioModel.js";

export const getAllEventosCalendario = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";

	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}

	try {
		const resGetAllEvents = await CalendarioModel.getAllEventos(
			page,
			limit,
			filtroNombre,
		);

		if (resGetAllEvents === 2) {
			return res.status(404).json({
				message: `No se han encontrado eventos que coincidan con: ${filtroNombre}`,
			});
		}

		return res.status(200).json({
			message: "Información de los eventos obtenida con éxito.",
			info: resGetAllEvents,
			pagination: resGetAllEvents.pagination,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el get de los eventos",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
