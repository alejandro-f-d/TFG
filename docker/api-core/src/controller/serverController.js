import { v4 as uuidv4 } from "uuid";
import ServerModel from "../models/serverModel.js";

export const postMaquina = async (req, res) => {
	const { nombre, propietarios, red, especificaciones } = req.body;

	if (
		!nombre ||
		!red ||
		!especificaciones ||
		!red.direccionIpPrivadaV4 ||
		!red.puertaEnlaceV4 ||
		!especificaciones.sistemaOperativo
	) {
		return res.status(400).json({
			error: `Faltan parámetros obligatorios ${nombre}, ${red}, ${especificaciones}, ${red.direccionIpPrivadaV4}, ${red.puertaEnlaceV4}`,
		});
	}
	try {
		const resBbdd = await ServerModel.postMaquina(req.body);
		if (resBbdd.status == "OK") {
			return res
				.status(201)
				.location(`/api/maquina/${resBbdd.uuid}`)
				.json({
					message: "Máquina creada con éxito.",
					uuid: resBbdd.uuid,
					url: `${process.env.API_DIRECTION}/api/maquina/${resBbdd.uuid}`,
				});
		}
	} catch (error) {
		console.error("Error al hacer post del servidor.", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getMaquinas = async (req, res) => {
	// En el route solo vamos a tener que verificar el token porque el resto lo hacemos aqui.
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";

	try {
		const permisos = req.user?.permisos || [];
		let maquinas;
		if (permisos.includes("admin:total") || permisos.includes("maq:getAll")) {
			maquinas = await ServerModel.getMaquinas(
				false,
				page,
				limit,
				filtroNombre,
			);
		} else if (permisos.includes("maq:getServer")) {
			maquinas = await ServerModel.getMaquinas(true, page, limit, filtroNombre);
		} else {
			return res
				.status(403)
				.json({ error: "Careces de los permisos necesarios." });
		}

		if (maquinas.totalItems === 0) {
			return res.status(404).json({
				message: `No se han encontrado maquinas/servidores que coincidan con: ${filtroNombre}`,
			});
		}

		return res.status(200).json(maquinas);
	} catch (error) {
		console.error("Error al hacer un get de las máquinas.", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getMaquina = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res
			.status(400)
			.json({ error: "Error con los parámetros del get máquina." });
	}
	let maquinas;
	try {
		const permisos = req.user?.permisos || [];
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(uuid)) {
			return res
				.status(404)
				.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
		}

		if (permisos.includes("admin:total") || permisos.includes("maq:getAll")) {
			maquinas = await ServerModel.getMaquina(false, uuid);
		} else if (permisos.includes("maq:getServer")) {
			maquinas = await ServerModel.getMaquina(true, uuid);
		} else {
			return res
				.status(403)
				.json({ error: "Careces de los permisos necesarios." });
		}
		if (maquinas === 2) {
			return res.status(404).json({ error: "Máquina no encontrada." });
		} else if (maquinas == 3) {
			return res
				.status(403)
				.json({ error: "Careces de los permisos necesarios." });
		} else {
			return res
				.status(200)
				.json({ message: "Máquina encontrada con éxito.", info: maquinas });
		}
	} catch (error) {
		console.error("Error al hacer un get de una máquina en específico.", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const deleteMaquina = async (req, res) => {
	const { uuid } = req.params;
	try {
		const resBorrado = await ServerModel.deleteMaquina(uuid);
		if (resBorrado) {
			return res.status(204).send();
		} else {
			return res.status(404).json({ message: "Máquina no encontrada." });
		}
	} catch (error) {
		console.log("Error al hacer un borrado de una máquina.");
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};

export const getServiciosPorMaquina = async (req, res) => {
	const { uuid } = req.params;
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 5;
		const filtroNombre = req.query.filtroNombre || "";
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(uuid)) {
			return res
				.status(404)
				.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
		}

		const resGetServiciosPorMaquina = await ServerModel.getServiciosMaquina(
			page,
			limit,
			filtroNombre,
			uuid,
		);
		if (resGetServiciosPorMaquina === 2) {
			return res.status(404).json({ error: "Máquina no encontrada." });
		}
		// console.log(resGetServiciosPorMaquina);
		return res.status(200).json({
			message: "Información de los servicios obtenida con éxito.",
			info: resGetServiciosPorMaquina,
		});
	} catch (error) {
		console.error(
			"Error al hacer el get de los servicios de una máquina en concreto.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const patchServer = async (req, res) => {
	const { uuid } = req.params;
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid)) {
		return res
			.status(404)
			.json({ error: "Máquina no encontrada (Formato de ID inválido)." });
	}
	const camposCambiados = req.body;
	if (Object.keys(camposCambiados).length == 0) {
		return res
			.status(400)
			.json({ error: "No se han enviado los campos a actualizar." });
	}
	try {
		const resPatch = await ServerModel.patchServer(uuid, camposCambiados);
		if (resPatch == 2) {
			return res.status(404).json({ error: "Máquina no encontrada" });
		}
		return res.status(204).json({ message: "Máquina actualizada con éxito." });
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer el patch a un servidor:",
			uuid,
			camposCambiados,
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
