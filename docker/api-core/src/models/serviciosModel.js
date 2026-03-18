import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { SERVICIOS_QUERIES } from "../querys/serviciosQuery.js";

class ServiciosModel {
	static async getAllInfoServicios(page = 1, limit = 10, filtroNombre = "") {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			// TODO: Poner que devuelva la cantidad de paginas, pág actual, ...
			const res = await pool.query(SERVICIOS_QUERIES.GET_ALL_INFO, [
				limit,
				offset,
				busqueda,
			]);
			return res.rows;
		} catch (error) {
			console.error("Error en getAllInfoServicios:", error.message);
			throw error;
		}
	}

	static async postServicio(uuidMaquina, datos) {
		const client = await pool.connect();
		const uuidServicio = uuidv4();
		const {
			nombreServicio,
			descripcionTecnica,
			entorno,
			publico,
			softwareBase,
			activo,
			nivelSeveridad,
			idUsuario,
			idPeticion,
			servidores,
			puertosAbiertos,
		} = datos;

		try {
			await client.query("BEGIN");
			const resIdMaq = await client.query(SERVICIOS_QUERIES.GET_ID_MAQUINA, [
				uuidMaquina,
			]);
			if (resIdMaq.rows.length === 0) return 2;

			const idMaquinaPrincipal = resIdMaq.rows[0].idmaquina;
			const resServicio = await client.query(SERVICIOS_QUERIES.POST_SERVICIO, [
				nombreServicio,
				descripcionTecnica,
				entorno,
				publico,
				softwareBase,
				activo,
				nivelSeveridad,
				idUsuario,
				idPeticion,
				uuidServicio,
			]);
			const idServicio = resServicio.rows[0].idservicio;

			const listaMaquinas = new Set(servidores || []);
			listaMaquinas.add(idMaquinaPrincipal);

			for (const idMaq of listaMaquinas) {
				await client.query(SERVICIOS_QUERIES.INSERT_CORRE, [idServicio, idMaq]);
			}

			for (const puerto of puertosAbiertos) {
				await client.query(SERVICIOS_QUERIES.INSERT_PUERTO, [
					puerto.numeroPuertoMaquina,
					puerto.protocolo,
					puerto.nombreServicio,
					puerto.puertoVirtual,
					idServicio,
				]);
			}

			await client.query("COMMIT");
			return uuidServicio;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	static async getServicioByUuid(uuidMaquina, uuidServicio) {
		const client = await pool.connect();
		try {
			const resIdMaq = await client.query(SERVICIOS_QUERIES.GET_ID_MAQUINA, [
				uuidMaquina,
			]);
			if (resIdMaq.rows.length === 0) return 2;

			const resDevolver = await client.query(
				SERVICIOS_QUERIES.GET_BY_UUID_COMPLETO,
				[uuidServicio, resIdMaq.rows[0].idmaquina],
			);
			return resDevolver.rows.length === 0 ? 3 : resDevolver.rows[0];
		} finally {
			client.release();
		}
	}

	static async deleteServicioByUuid(uuidMaquina, uuidServicio) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const resVerificar = await client.query(
				SERVICIOS_QUERIES.VERIFICAR_RELACION,
				[uuidServicio, uuidMaquina],
			);
			if (resVerificar.rows.length === 0) {
				await client.query("ROLLBACK");
				return 2;
			}

			const idServicio = resVerificar.rows[0].idservicio;
			await client.query(SERVICIOS_QUERIES.DELETE_CORRE, [idServicio]);
			await client.query(SERVICIOS_QUERIES.DELETE_PUERTOS, [idServicio]);
			const resDelete = await client.query(SERVICIOS_QUERIES.DELETE_SERVICIO, [
				idServicio,
			]);

			await client.query("COMMIT");
			return resDelete.rowCount;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	static async patchServicio(uuidMaquina, uuidServicio, camposCambiados) {
		const client = await pool.connect();
		const { servidores, puertosAbiertos, ...camposServicio } = camposCambiados;

		try {
			await client.query("BEGIN");
			const resVer = await client.query(SERVICIOS_QUERIES.VERIFICAR_RELACION, [
				uuidServicio,
				uuidMaquina,
			]);
			if (resVer.rowCount === 0) {
				await client.query("ROLLBACK");
				return 2;
			}

			const idServicio = resVer.rows[0].idservicio;
			const camposPermitidos = [
				"nombreServicio",
				"descripcionTecnica",
				"entorno",
				"publico",
				"softwareBase",
				"activo",
				"nivelSeveridad",
			];
			const camposFiltrados = {};

			Object.keys(camposServicio).forEach((key) => {
				if (camposPermitidos.includes(key))
					camposFiltrados[key.toLowerCase()] = camposServicio[key];
			});

			const keys = Object.keys(camposFiltrados);
			if (keys.length > 0) {
				const values = Object.values(camposFiltrados);
				values.push(uuidServicio);
				await client.query(SERVICIOS_QUERIES.UPDATE_DYNAMIC(keys), values);
			}

			if (servidores !== undefined) {
				await client.query(SERVICIOS_QUERIES.DELETE_CORRE, [idServicio]);
				if (Array.isArray(servidores)) {
					for (const sId of servidores)
						await client.query(SERVICIOS_QUERIES.INSERT_CORRE, [
							idServicio,
							sId,
						]);
				}
			}

			if (puertosAbiertos !== undefined) {
				await client.query(SERVICIOS_QUERIES.DELETE_PUERTOS, [idServicio]);
				if (Array.isArray(puertosAbiertos)) {
					for (const p of puertosAbiertos) {
						await client.query(SERVICIOS_QUERIES.INSERT_PUERTO, [
							p.numeroPuertoMaquina,
							p.protocolo,
							p.nombreServicio,
							p.puertoVirtual,
							idServicio,
						]);
					}
				}
			}

			await client.query("COMMIT");
			return { status: "OK" };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}

export default ServiciosModel;
