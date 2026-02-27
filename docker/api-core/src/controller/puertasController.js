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
