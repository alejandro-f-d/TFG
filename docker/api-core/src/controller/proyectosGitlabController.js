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

export const getProyectoGitlab = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	try {
		const resultado = await ProyectosGitlabModel.getAllProyects(
			page,
			limit,
			filtroNombre,
		);
		if (resultado.totalItems === 0) {
			return res.status(400).json({
				message: `No se han encontrado usuarios que coincidan con: ${filtroNombre}`,
			});
		}
		return res.status(200).json({
			message: "Lista de proyectos de gitlab devuelta correctamente.",
			info: resultado,
			pagination: resultado.pagination,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer un get de los proyectos de gitlab",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
