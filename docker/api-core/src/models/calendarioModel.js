import pool from "../bbdd/conexion.js";
import { CALENDAR_QUERY } from "../querys/calendarioQuery.js";
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
}

export default CalendarioModel;
