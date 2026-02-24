import { v4 as uuidv4 } from "uuid";
import ProyectosGitlabModel from "../models/proyectosGitlabModel.js";

export const postProyectoGitlab = async (req, res) => {
	const { nombre } = req.body;
	if (!nombre) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	try {
		const resPost = await ProyectosGitlabModel.postProyectoGitlab(req.body);
		const uuidPost = resPost.uuid;
		return res
			.status(201)
			.location(`/api/proyectosgitlab/${uuidPost}`)
			.json({
				message: "Proyecto gitlab creado con éxito.",
				uuid: uuidPost,
				url: `${process.env.API_DIRECTION}/api/proyectosgitlab/${uuidPost}`,
			});
	} catch (error) {
		console.error("Se ha producido un error al hacer el post de un proyecto.");
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
