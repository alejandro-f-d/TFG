import { v4 as uuidv4 } from "uuid";
import RolModel from "../models/rolModel.js";

export const postRole = async (req, res) => {
	const { nombre, descripcion, permisos } = req.body;

	// Validación básica (aunque Joi debería encargarse de esto antes)
	if (!nombre || !permisos) {
		return res
			.status(400)
			.json({ error: "Petición mal formada: falta nombre o permisos" });
	}

	try {
		const resPostRole = await RolModel.postRole(
			req.user?.permisos,
			req.user?.id,
			req.body,
		);

		if (resPostRole.status === "OK") {
			return res
				.status(201)
				.location(`/api/rol/${resPostRole.uuid}`)
				.json({
					message: "Rol creado con éxito.",
					uuid: resPostRole.uuid,
					url: `${process.env.API_DIRECTION}/api/rol/${resPostRole.uuid}`,
				});
		}
	} catch (error) {
		console.error("Error en postRole (Controller):", error.message);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
