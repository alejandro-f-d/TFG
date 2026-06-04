import ServiciosModel from "../models/serviciosModel.js";
import { v4 as uuidv4 } from "uuid";

export const getServicios = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	const status = req.query.status || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}

	try {
		const resServicios = await ServiciosModel.getAllInfoServicios(
			page,
			limit,
			filtroNombre,
			status,
		);
		if (resServicios === 2) {
			return res
				.status(404)
				.json({
					error: "No se ha encontrado ningún servicio con esos filtros.",
				});
		}
		return res.status(200).json({
			message: "Listado de los servicios obtenido correctamente.",
			info: resServicios,
		});
	} catch (error) {
		console.log("Error al hacer un get de los servicios.", error);
		return res.status(500).json({ error: "Error interno del servidor" });
	}
};

export const postServicios = async (req, res) => {
	const { uuid } = req.params;
	const {
		nombreServicio,
		descripcionTecnica,
		entorno,
		publico, // boolean
		softwareBase,
		activo, //boolean
		nivelSeveridad,
		idUsuario,
		idPeticion,
		servidores, //Arrray de integers. Relación de corre.
		puertosAbiertos, // Contiene diferente información => numeroPuertoMaquina, protocolo, nombreServicio, puertoVirtual Relación conecta.
	} = req.body;

	if (!nombreServicio || !idPeticion || !idUsuario) {
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
		const resPostServicio = await ServiciosModel.postServicio(uuid, req.body);
		if (resPostServicio === 2) {
			return res.status(404).json({ error: "Maquina no encontrada." });
		}

		return res
			.status(201)
			.location(`/api/maquina/${uuid}/servicios/${resPostServicio}`)
			.json({
				message: "Servicio creado con éxito",
				id: resPostServicio,
				url: `${process.env.API_DIRECTION}/api/maquina/${uuid}/servicios/${resPostServicio}`,
			});
	} catch (error) {
		console.error("Un error ha ocurrido en el postServicio", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getServicioByUuid = async (req, res) => {
	const { uuid, uuidServicio } = req.params;
	if (!uuid || !uuidServicio) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid) || !uuidRegex.test(uuidServicio)) {
		return res.status(404).json({
			error: "Máquina o servicio no encontrado (Formato de ID inválido).",
		});
	}
	try {
		const resGetServicioByUuid = await ServiciosModel.getServicioByUuid(
			uuid,
			uuidServicio,
		);

		if (resGetServicioByUuid === 2) {
			return res.status(404).json({ error: "Máquina no encontrada." });
		}
		if (resGetServicioByUuid === 3) {
			return res.status(404).json({
				error: "El servicio no existe o no está asociado a esta máquina.",
			});
		}

		return res.status(200).json({
			message: "Información obtenida de manera correcta.",
			info: resGetServicioByUuid,
		});
	} catch (error) {
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const deleteServicioByUuid = async (req, res) => {
	const { uuid, uuidServicio } = req.params;

	if (!uuid || !uuidServicio) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid) || !uuidRegex.test(uuidServicio)) {
		return res.status(404).json({
			error: "Máquina o servicio no encontrado (Formato de ID inválido).",
		});
	}
	try {
		const result = await ServiciosModel.deleteServicioByUuid(
			uuid,
			uuidServicio,
		);

		if (result === 2) {
			return res.status(404).json({
				error:
					"No se puede eliminar: El servicio no existe o no pertenece a la máquina especificada.",
			});
		}

		return res.status(204).send();
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Error interno al eliminar el servicio." });
	}
};

export const patchServicio = async (req, res) => {
	const { uuid, uuidServicio } = req.params;
	if (!uuid || !uuidServicio) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (!uuidRegex.test(uuid) || !uuidRegex.test(uuidServicio)) {
		return res.status(404).json({
			error: "Máquina o servicio no encontrado (Formato de ID inválido).",
		});
	}
	const camposCambiados = req.body;
	if (Object.keys(camposCambiados).length == 0) {
		return res.status(400).json({ error: "Petición mal formada" });
	}
	try {
		const resPatch = await ServiciosModel.patchServicio(
			uuid,
			uuidServicio,
			camposCambiados,
		);
		if (resPatch == 2) {
			return res
				.status(404)
				.json({ error: "Máquina o servicio no encontrado." });
		}
		return res.status(204).json({ message: "Servicio actualizado con éxito." });
	} catch (error) {
		console.error(
			"Se ha producido un error al realizar el patch a un servicio. ",
			uuid,
			uuidServicio,
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
