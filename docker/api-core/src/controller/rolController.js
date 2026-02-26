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

export const getRoles = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}
	try {
		const resGetAllRoles = await RolModel.getRoles(page, limit, filtroNombre);
		if (resGetAllRoles.pagination.totalItems === 0) {
			return res.status(404).json({
				message: `No se han encontrado roles que coincidan con: ${filtroNombre}`,
			});
		}
		return res.status(200).json(resGetAllRoles);
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el get de los roles",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getRolesByUuid = async (req, res) => {
	const { uuid } = req.params;
	if(!uuid) {
		return res.status(400).json({error: "Petición mal formada."});
	}
	try {
			const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(uuid)) {
			return res
				.status(404)
				.json({ error: "Role no encontrado (Formato de ID inválido)." });
		}

		const resGetRoleByUuid = await RolModel.getRolesByUuid(uuid);

		if(resGetRoleByUuid == 2){
			return res.status(404).json({error: "Role no encontrado."});
		}
		
		return res.status(200).json({message: "Role encontrado con éxito.", info: resGetRoleByUuid});
	} catch (error) {
		console.error("Se ha producido un error al hacer el get de un role por uuid.", uuid, error);
		
		
	}
}

export const deleteRolByUuid = async(req, res) => {
	const { uuid } = req.params;
	if(!uuid){
		return res.status(400).json({error: "Petición mal formada."});
	}
	try {
		const resBorrarRol = await RolModel.deleteRolByUuid(uuid);
		if(resBorrarRol === 2){
			return res.status(404).json({error: "Rol no encontrado"});
		}
		return res.status(204).json({message: "Rol borrado con éxito."});
	} catch (error) {
		console.error("Se ha producido un error al intentar borrar un rol.", uuid, error);
		return res.status(500).json({error: "Error interno del servidor."});
	}
}

export const patchRolByUuid = async(req, res) => {
	const { uuid } = req.params;
	if(!uuid){
		return res.status(400).json({error: "Petición mal formada."});
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid)) {
		return res
			.status(404)
			.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
	}
	const camposCambiados = req.body;
	if(Object.keys(camposCambiados).length == 0){
		return res.status(400).json({message: "Query mal formada."});
	}
	try {
		const resPatch = await RolModel.patchRole(uuid, camposCambiados);
		if(resPatch == 2){
			return res.status(404).json({error: "Rol no encontrado."});
		}
		return res.status(204).json({message: "Rol actualizado con éxito"});
	} catch (error) {
		console.error("Se ha producido un error al hacer un patch a un rol", uuid, camposCambiados, error);
		return res.status(500).json({error: "Error interno del servidor."});
	}

}
