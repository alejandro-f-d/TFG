import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { MAQUINA_QUERIES } from "../querys/maquinaQuery.js";
class ServerModel {
	static async postMaquina(datos) {
		const uuidMaquina = uuidv4();
		const valuesAlias = [
			`maquina:verServicios:${uuidMaquina}`,
			`maquina:crearServicios:${uuidMaquina}`,
			`maquina:borrarServicios:${uuidMaquina}`,
			`maquina:calendario:${uuidMaquina}`,
		];

		const valuesPostServer = [
			uuidMaquina,
			datos.nombre,
			datos.caducidadSsl,
			datos.certificadoSslActivo,
			datos.emisorSsl,
			datos.red.direccionIpPrivadaV4,
			datos.red.direccionIpPublicaV4,
			datos.red.direccionIpPrivadaV6,
			datos.red.direccionIpPublicaV6,
			datos.red.puertaEnlaceV4,
			datos.red.puertaEnlaceV6,
			datos.especificaciones.ram,
			datos.especificaciones.sistemaOperativo,
			datos.especificaciones.esServidor,
		];

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			await client.query(MAQUINA_QUERIES.SERVER_POST, valuesPostServer);
			if (datos.especificaciones.esServidor) {
				await client.query(MAQUINA_QUERIES.CREAR_PERMISOS, valuesAlias);
			}
			await client.query("COMMIT");
			return { status: "OK", uuid: uuidMaquina };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en postMaquina:", error.message);
			throw error;
		} finally {
			client.release();
		}
	}

	static async getMaquinas(
		soloServidores,
		page = 1,
		limit = 10,
		filtroNombre = "",
	) {
		const params = [];
		const conditions = [];
		if (soloServidores) {
			conditions.push(`esservidor = true`);
		}

		if (filtroNombre) {
			params.push(`%${filtroNombre}%`);
			conditions.push(`nombre ILIKE $${params.length}`);
		}

		const offset = (page - 1) * limit;
		params.push(limit);
		const limitIndex = params.length;

		params.push(offset);
		const offsetIndex = params.length;

		try {
			const query = MAQUINA_QUERIES.BUILD_GET_ALL(
				conditions,
				limitIndex,
				offsetIndex,
			);

			const res = await pool.query(query, params);
			return res.rows;
		} catch (error) {
			console.error("Error en getMaquinas Model:", error.message);
			throw error;
		}
	}

	static async getMaquina(soloServidores, uuid) {
		try {
			const resQuery = await pool.query(MAQUINA_QUERIES.GET_MAQUINA_UUID, [
				uuid,
			]);
			if (resQuery.rows.length === 0) {
				return 2;
			} else if (resQuery.rows[0].esservidor) {
				return resQuery.rows[0];
			} else if (!resQuery.rows[0].esservidor && !soloServidores) {
				return resQuery.rows[0];
			} else {
				return 3;
			}
		} catch (error) {
			console.error(
				"Error al hacer el get de un servidor en específico",
				error,
			);
			throw error;
		}
	}

	static async deleteMaquina(uuid) {
		const queryDeletePerms = ``;
		const queryDeleteMaquina = ``;
		try {
			const filtroPermiso = `%${uuid}%`;
			await pool.query(MAQUINA_QUERIES.DELETE_PERMS, [filtroPermiso]);
			const resBorrado = await pool.query(MAQUINA_QUERIES.DELETE_MAQ, [uuid]);
			return resBorrado.rowCount > 0;
		} catch (error) {
			console.error("Error al hacer delete de una máquina:", error.message);
			throw error;
		}
	}
	static async getServiciosMaquina(
		page = 1,
		limit = 10,
		filtroNombre = "",
		uuid,
	) {
		try {
			const resExiste = await pool.query(MAQUINA_QUERIES.VERIFICAR_EXISTE, [
				uuid,
			]);
			if (resExiste.rows.length === 0) return 2;
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const res = await pool.query(MAQUINA_QUERIES.GET_SERVICIOS_DETALLE, [
				limit,
				offset,
				busqueda,
				uuid,
			]);
			return res.rows;
		} catch (error) {
			console.error("Error al obtener servicios de máquina:", error.message);
			throw error;
		}
	}

	static async patchServer(uuid, camposCambiados) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const camposPermitidos = [
				"nombre",
				"caducidadssl",
				"certificadosslactivo",
				"emisorssl",
				"direccionipprivadav4",
				"direccionippublicav4",
				"direccionipprivadav6",
				"direccionippublicav6",
				"puertaenlacev4",
				"puertaenlacev6",
				"ram",
				"sistemaoperativo",
				"esservidor",
			];

			const camposFiltrados = {};
			Object.keys(camposCambiados).forEach((key) => {
				if (camposPermitidos.includes(key)) {
					camposFiltrados[key] = camposCambiados[key];
				}
			});

			const keys = Object.keys(camposFiltrados);

			if (keys.length === 0) {
				const check = await client.query(MAQUINA_QUERIES.VERIFICAR_EXISTE, [
					uuid,
				]);
				await client.query("COMMIT");
				return check.rows.length > 0 ? { status: "OK" } : 2;
			}

			const values = Object.values(camposFiltrados);
			values.push(uuid);

			const sql = MAQUINA_QUERIES.UPDATE_SERVER_DYNAMIC(keys);
			const res = await client.query(sql, values);

			if (res.rowCount === 0) {
				await client.query("ROLLBACK");
				return 2;
			}

			await client.query("COMMIT");
			return { status: "OK" };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en patchServer (Model):", uuid, error.message);
			throw error;
		} finally {
			client.release();
		}
	}
}
export default ServerModel;
