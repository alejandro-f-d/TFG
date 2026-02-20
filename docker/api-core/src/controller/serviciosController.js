import ServiciosModel from "../models/serviciosModel.js";
import { v4 as uuidv4 } from "uuid";

export const getServicios = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	try {
		const resServicios = await ServiciosModel.getAllInfoServicios(
			page,
			limit,
			filtroNombre,
		);
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

	if (!nombreServicio || !idPeticion || !idUsuario || !servidores) {
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
		// TODO: Hacer la respuesta 201 con su location.
	} catch (error) {
		console.error("Un error ha ocurrido en el postServicio", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
