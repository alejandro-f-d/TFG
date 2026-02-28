import CalendarioModel from "../models/calendarioModel.js";

export const getAllEventosCalendario = async (req, res) => {
	const { page, limit, filtroNombre, fechaInicio, fechaFin } = req.query;

	// Validación estricta para que el test_92 reciba el 400 esperado
	if ((page && parseInt(page) < 1) || (limit && isNaN(parseInt(limit)))) {
		return res.status(400).json({ error: "Petición invalida" });
	}

	const validPage = parseInt(page) || 1;
	const validLimit = parseInt(limit) || 5;

	try {
		const resGetAllEvents = await CalendarioModel.getAllEventos(
			validPage,
			validLimit,
			filtroNombre || "",
			fechaInicio || null,
			fechaFin || null,
		);

		if (resGetAllEvents === 2) {
			return res.status(404).json({
				message: `No se han encontrado eventos que coincidan con: ${filtroNombre || ""}`,
			});
		}

		// Asegúrate de enviar este objeto exactamente así
		return res.status(200).json({
			status: "OK",
			rows: resGetAllEvents.rows,
			pagination: resGetAllEvents.pagination,
		});
	} catch (error) {
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
