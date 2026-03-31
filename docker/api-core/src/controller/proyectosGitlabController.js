import { v4 as uuidv4 } from "uuid";
import ProyectosGitlabModel from "../models/proyectosGitlabModel.js";
import { crearProyecto } from "../integrations/gitlab.js";

export const postProyectoGitlab = async (req, res) => {
	const { nombre, participantes } = req.body;
	if (!nombre) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	try {
		const nombresUsersGitlab =
			await ProyectosGitlabModel.getGitlabUsernamesByIds(participantes);
		const idProyecto = await crearProyecto(nombre, nombresUsersGitlab);
		console.log("El id del proyecto es:", idProyecto);
		const resPost = await ProyectosGitlabModel.postProyectoGitlab(
			req.body,
			idProyecto,
		);
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
		console.error(
			"Se ha producido un error al hacer el post de un proyecto.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getProyectoGitlab = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}

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
			// pagination: resultado.pagination,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer un get de los proyectos de gitlab",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getProyectoGitlabByUuid = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Falta el parámetro UUID." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res.status(400).json({
			error: "El formato del UUID proporcionado es inválido.",
		});
	}
	try {
		const proyecto = await ProyectosGitlabModel.getProyectoGitlabByUuid(uuid);
		if (!proyecto) {
			return res.status(404).json({
				message: `No se ha encontrado ningún proyecto con el UUID: ${uuid}`,
			});
		}
		return res.status(200).json({
			message: "Proyecto de GitLab encontrado correctamente.",
			info: proyecto,
		});
	} catch (error) {
		console.error("Error al obtener proyecto por UUID:", {
			uuid,
			error: error.message,
		});
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const patchProyectoGitlab = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Falta el parámetro UUID." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res.status(400).json({
			error: "El formato del UUID proporcionado es inválido.",
		});
	}
	const camposCambiados = req.body;

	if (Object.keys(camposCambiados).length == 0) {
		return res
			.status(400)
			.json({ error: "No se han enviado los campos a actualizar." });
	}

	try {
		const resPatch = await ProyectosGitlabModel.patchProyecto(
			uuid,
			camposCambiados,
		);
		if (resPatch == 2) {
			return res.status(404).json({ error: "Proyecto gitlab no encontrado" });
		}
		return res
			.status(204)
			.json({ message: "Proyecto gitlab actualizado con éxito" });
	} catch (error) {
		console.error("Error al hacer patch a un proyecto de gitlab:", {
			uuid,
			camposCambiados,
			error: error.message,
		});
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
