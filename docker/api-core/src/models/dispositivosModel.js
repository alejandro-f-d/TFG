import pool from "../bbdd/conexion.js";
import { DISPOSITIVOS_QUERY } from "../querys/dispositivosQuery.js";
import { v4 as uuidv4 } from "uuid";

class DispositivosModel {
	static async postDispositivo(data) {
		const uuid = uuidv4();
		const valuesQuery = [
			data.nombre,
			data.puntoMontaje,
			data.capacidad,
			data.capacidadUsada,
			data.tecnologia,
			uuid,
			data.idMaquina,
			data.idTipoDispositivo,
		];
		try {
			await pool.query(DISPOSITIVOS_QUERY.POST_QUERY, valuesQuery);
			return { status: "OK", uuid: uuid };
		} catch (error) {
			console.error(
				"Se ha producido un error al realizar el post del dispositivo.",
				error,
			);
			throw error;
		}
	}
	static async getAllDispositivos(page, limit, filtroNombre) {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const res = await pool.query(DISPOSITIVOS_QUERY.GET_ALL_PAGINADO, [
				limit,
				offset,
				busqueda,
			]);
			return res.rows;
		} catch (error) {
			console.error("Error en getAllDispositivos:", error.message);
			throw error;
		}
	}
	static async getDispositivoByUuid(uuid) {
		try {
			const res = await pool.query(DISPOSITIVOS_QUERY.GET_BY_UUID, [uuid]);
			return res.rows[0];
		} catch (error) {
			console.error("Error en getDispositivoByUuid:", error);
			throw error;
		}
	}
}
export default DispositivosModel;
