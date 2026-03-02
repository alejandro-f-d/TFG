import CalendarioModel from "../models/calendarioModel.js";

export const getAllEventosCalendario = async (req, res) => {
	const { page, limit, filtroNombre, fechaInicio, fechaFin } = req.query;
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

		return res.status(200).json({
			status: "OK",
			rows: resGetAllEvents.rows,
			pagination: resGetAllEvents.pagination,
		});
	} catch (error) {
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const postCalendario = async (req, res) => {
	const { uuid } = req.params;

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res
			.status(400)
			.json({ error: "Formato de ID de máquina inválido." });
	}

	try {
		const idUsuario = req.user?.idUsuario;
		const resultado = await CalendarioModel.postReserva(
			req.body,
			uuid,
			idUsuario,
		);

		if (resultado === 2) {
			return res.status(404).json({
				error:
					"La máquina especificada no existe o no es un servidor. Las reservas solo se pueden realizar en servidores.",
			});
		}

		return res
			.status(201)
			.location(`/api/reservas/${resultado.uuid}`)
			.json({
				message: "Reserva creada con éxito.",
				uuid: resultado.uuid,
				url: `${process.env.API_DIRECTION}/api/reservas/${resultado.uuid}`,
			});
	} catch (error) {
		if (error.message === "USUARIO_NO_IDENTIFICADO") {
			return res.status(401).json({ error: "Sesión de usuario no válida." });
		}
		console.error("Error al procesar reserva:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getDetalleReserva = async (req, res) => {
	const { uuid } = req.params;
	const idUsuarioAutenticado = req.user?.idUsuario;
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res.status(400).json({
			error: "Formato de identificador de reserva inválido.",
		});
	}
	try {
		const reserva = await CalendarioModel.getReservaById(
			uuid,
			idUsuarioAutenticado,
		);
		if (!reserva) {
			return res.status(404).json({
				error: "Reserva no encontrada o no tienes permisos para verla.",
			});
		}
		return res.status(200).json(reserva);
	} catch (error) {
		console.error("Error en getDetalleReserva:", error);
		return res.status(500).json({
			error: "Se ha producido un error interno al consultar la reserva.",
		});
	}
};

export const deleteReserva = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res.status(400).json({
			error: "Formato de identificador de reserva inválido.",
		});
	}
	const idUsuario = req.user?.idUsuario;

	try {
		const resultado = await CalendarioModel.deleteReserva(uuid, idUsuario);
		if (resultado == 2) {
			return res.status(404).json({
				error: "Reserva no encontrada o no tienes permisos para eliminarla.",
			});
		}
		return res.status(204).json({
			message: "Reserva eliminada correctamente.",
			uuid: uuid,
		});
	} catch (error) {
		console.error(
			"Se ha producido en error al borrar una reserva por uuid.",
			uuid,
			error,
		);

		return res
			.status(500)
			.json({ error: "Error interno al intentar eliminar la reserva." });
	}
};

export const getReservasMaquina = async (req, res) => {
	const { uuid } = req.params;
	const idUsuario = req.user.idUsuario;

	let { fechaInicio, fechaFin } = req.query;

	if (!fechaInicio || !fechaFin) {
		const hoy = new Date();
		const unMesDespues = new Date();
		unMesDespues.setMonth(hoy.getMonth() + 1);

		fechaInicio = fechaInicio || hoy.toISOString();
		fechaFin = fechaFin || unMesDespues.toISOString();
	}

	try {
		const reservas = await CalendarioModel.getReservasByMaquina(
			uuid,
			idUsuario,
			fechaInicio,
			fechaFin,
		);

		return res.status(200).json({
			message: "Listado de reservas obtenido con éxito.",
			info: reservas,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Error al obtener el calendario." });
	}
};

export const patchReserva = async (req, res) => {
	const { uuid } = req.params;
	const idUsuario = req.user.idUsuario;
	const camposCambiados = req.body;

	try {
		const resultado = await CalendarioModel.patchReserva(
			uuid,
			idUsuario,
			camposCambiados,
		);

		if (resultado === 2) {
			return res.status(404).json({
				error: "Reserva no encontrada o no tienes permisos para editarla.",
			});
		}

		return res.status(204).json({
			message: "Reserva actualizada con éxito.",
			status: "OK",
		});
	} catch (error) {
		console.error("Error en patchReserva (Controller):", error);
		return res
			.status(500)
			.json({ error: "Error interno del servidor al actualizar la reserva." });
	}
};
