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
