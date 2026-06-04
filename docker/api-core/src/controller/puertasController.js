import PuertasModel from "../models/puertasModel.js";

export const postPuerta = async (req, res) => {
	const { nombre, ubicacion } = req.body;
	if (!nombre || !ubicacion) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	try {
		const resPostPuerta = await PuertasModel.postPuerta(nombre, ubicacion);
		if (resPostPuerta.status === "OK") {
			return res
				.status(201)
				.location(`/api/puertas/${resPostPuerta.id}`)
				.json({
					message: "Puerta creada con éxito.",
					uuid: resPostPuerta.id,
					url: `${process.env.API_DIRECTION}/api/puertas/${resPostPuerta.id}`,
				});
		}
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el post de una puerta.",
			nombre,
			ubicacion,
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getPuertas = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}
	try {
		const resGetPuertas = await PuertasModel.getPuertas(
			page,
			limit,
			filtroNombre,
		);
		return res.status(200).json({
			message: "Listado de las puertas obtenido correctamente.",
			info: resGetPuertas,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer un get de puertas global.",
		);
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};

export const getPuertasByUuid = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid)) {
		return res
			.status(404)
			.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
	}
	try {
		const resGetPuertas = await PuertasModel.getPuertasByUuid(uuid);
		if (resGetPuertas == 2) {
			return res.status(404).json({ error: "Puerta no encontrada." });
		}
		return res
			.status(200)
			.json({ message: "Puerta encontrada con éxito", info: resGetPuertas });
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener la información de una puerta by uuid.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const deletePuertaByUuid = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid)) {
		return res
			.status(404)
			.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
	}
	try {
		const resBorrado = await PuertasModel.deleteByUuid(uuid);
		if (resBorrado == 2) {
			return res.status(404).json({ error: "Puerta no encontrada." });
		}
		return res.status(204).json({ message: "Puerta borrada con éxito." });
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer un delete de la puerta.",
			uuid,
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
