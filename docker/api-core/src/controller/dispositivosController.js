import DispositivosModel from "../models/dispositivosModel.js";
export const postDispositivo = async (req, res) => {
	const { nombre, idTipoDispositivo } = req.body;
	if (!nombre || !idTipoDispositivo) {
		return res.status(400).json({ error: "Petición mal formada" });
	}
	try {
		const resPostDispo = await DispositivosModel.postDispositivo(req.body);
		return res
			.status(201)
			.location(`/api/dispositivos/${resPostDispo.uuid}`)
			.json({
				message: "Dispositivo creado con éxito.",
				uuid: resPostDispo.uuid,
				url: `${process.env.API_DIRECTION}/api/dispositivos/${resPostDispo.uuid}`,
			});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el post de un dispositivo.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getAllDispositivos = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}
	try {
		const resGetDispositivos = await DispositivosModel.getAllDispositivos(
			page,
			limit,
			filtroNombre,
		);
		return res.status(200).json({
			message: "Listado de dispositivos obtenido correctamente.",
			info: resGetDispositivos,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer un get de dispositivos global.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};

export const getDispositivoByUuid = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada" });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res.status(400).json({
			error: "El formato del UUID proporcionado es inválido.",
		});
	}
	try {
		const dispositivo = await DispositivosModel.getDispositivoByUuid(uuid);
		if (!dispositivo) {
			return res.status(404).json({
				message: `No se ha encontrado ningún dispositivo con el UUID: ${uuid}`,
			});
		}
		return res.status(200).json({
			message: "dispositivo encontrado correctamente.",
			info: dispositivo,
		});
	} catch (error) {
		console.error("Error al obtener dispositivo por UUID:", {
			uuid,
			error: error.message,
		});
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
