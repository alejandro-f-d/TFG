import pool from "../bbdd/conexion.js";
import { QUERIES_CADUCIDAD } from "../querys/CaducidadFechasQuery.js";
class CaducidadFechas {
	static async getCaducidad() {
		try {
			// Extraemos la lista de usuarios y la lista de peticiones.
			const res = await pool.query(
				QUERIES_CADUCIDAD.GET_TODO_CADUCIDAD_UNIFICADO,
				[],
			);
			const listaCaducidades = res.rows[0].todo_junto || [];
			const bodyCorreo = listaCaducidades
				.map((item) => {
					// Limpiamos el tipo de caducidad para que sea más legible
					const tipo = item.tipo_caducidad.replace("_", " ").toLowerCase();

					// Formateamos la línea
					return `• Sujeto: ${item.sujeto}, UUID: ${item.identificador_uuid}, Tipo: ${tipo}, Email: ${item.correoinstitucional}`;
				})
				.join("\n");

			console.log(bodyCorreo);
			return bodyCorreo;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener la caducidad de los usuarios y de las peticiones.",
				error,
			);
			throw error;
		}
	}
	static async getCorreoAdministradores() {
		try {
			const correoAdministradores = await pool.query(
				QUERIES_CADUCIDAD.OBTENER_CORREO_ADMIN,
				[],
			);
			console.log(correoAdministradores.rows[0].lista_destinatarios);
			return correoAdministradores.rows[0].lista_destinatarios;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el correo de los administradores.",
				error,
			);
			throw error;
		}
	}
}
export default CaducidadFechas;
