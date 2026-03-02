import pool from "../bbdd/conexion.js";
import { CALENDAR_QUERY } from "../querys/calendarioQuery.js";
import { v4 as uuidv4 } from "uuid";

class CalendarioModel {
	static async getAllEventos(
		page = 1,
		limit = 10,
		filtroNombre = "",
		fechaInicio = null,
		fechaFin = null,
	) {
		const offset = (page - 1) * limit;
		const busqueda =
			filtroNombre && filtroNombre.trim() !== "" ? `%${filtroNombre}%` : null;

		try {
			const res = await pool.query(CALENDAR_QUERY.GET_CALENDARIO_ALL, [
				limit,
				offset,
				busqueda,
				fechaInicio,
				fechaFin,
			]);

			const totalItems =
				res.rows.length > 0 ? parseInt(res.rows[0].total_registros) : 0;
			if (totalItems === 0) return 2;

			return {
				status: "OK",
				rows: res.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
					pageSize: limit,
				},
			};
		} catch (error) {
			console.error("Error en getAllEventos:", error);
			throw error;
		}
	}
	static async postReserva(data, uuidServidor, idUsuario) {
		const uuidReserva = uuidv4();
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const resIdMaquina = await client.query(CALENDAR_QUERY.GET_MAQUINA_ID, [
				uuidServidor,
			]);
			if (resIdMaquina.rows.length === 0) {
				client.query("ROLLBACK");
				return 2;
			}
			const idMaquina = resIdMaquina.rows[0].idmaquina;
			if (!idUsuario) {
				await client.query("ROLLBACK");
				throw new Error("USUARIO_NO_IDENTIFICADO");
			}
			await client.query(CALENDAR_QUERY.POST_RESERVA, [
				data.fechaInicio,
				data.nombre,
				data.descripcion,
				data.fechaFin,
				idUsuario,
				idMaquina,
				uuidReserva,
			]);
			await client.query("COMMIT");
			return { status: "OK", uuid: uuidReserva };
		} catch (error) {
			client.query("ROLLBACK");
			console.error(
				"Se ha producido un error al hacer un post de la reserva.",
				error,
				data,
				uuidServidor,
			);
			throw error;
		} finally {
			client.release();
		}
	}
	static async getReservaById(uuidReserva, idUsuario) {
		try {
			const res = await pool.query(CALENDAR_QUERY.GET_RESERVA_CON_PERMISO, [
				uuidReserva,
				idUsuario,
			]);

			if (res.rows.length === 0) {
				return null;
			}

			return res.rows[0];
		} catch (error) {
			console.error("Error en getReservaById:", error);
			throw error;
		}
	}
	static async deleteReserva(uuidReserva, idUsuario) {
		try {
			const res = await pool.query(CALENDAR_QUERY.DELETE_RESERVA_SEGURA, [
				uuidReserva,
				idUsuario,
			]);

			if (res.rowCount === 0) {
				return 2;
			}

			return res.rows[0];
		} catch (error) {
			console.error("Error en deleteReserva:", error);
			throw error;
		}
	}
	static async getReservasByMaquina(
		uuidMaquina,
		idUsuario,
		fechaInicio,
		fechaFin,
	) {
		try {
			const res = await pool.query(CALENDAR_QUERY.GET_RESERVAS_MAQUINA, [
				uuidMaquina,
				idUsuario,
				fechaInicio,
				fechaFin,
			]);
			return res.rows;
		} catch (error) {
			throw error;
		}
	}
	static async patchReserva(uuid, idUsuario, camposCambiados) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const camposPermitidosDB = [
				"nombre",
				"descripcion",
				"fechainicio",
				"fechafin",
			];

			const camposFiltrados = {};
			Object.keys(camposCambiados).forEach((key) => {
				const keyDB = key.toLowerCase();

				if (camposPermitidosDB.includes(keyDB)) {
					camposFiltrados[keyDB] = camposCambiados[key];
				}
			});

			const keys = Object.keys(camposFiltrados);

			if (keys.length === 0) {
				const check = await client.query(
					CALENDAR_QUERY.VERIFICAR_EXISTE_RESERVA,
					[uuid],
				);
				await client.query("COMMIT");
				return check.rows.length > 0 ? { status: "OK" } : 2;
			}

			const values = [uuid, idUsuario, ...Object.values(camposFiltrados)];

			const sql = CALENDAR_QUERY.UPDATE_RESERVA_DYNAMIC(keys);

			const res = await client.query(sql, values);

			if (res.rowCount === 0) {
				await client.query("ROLLBACK");
				return 2;
			}

			await client.query("COMMIT");
			return { status: "OK" };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en patchReserva (Model):", uuid, error.message);
			throw error;
		} finally {
			client.release();
		}
	}
}

export default CalendarioModel;
