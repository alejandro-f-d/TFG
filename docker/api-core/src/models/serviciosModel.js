import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";

class ServiciosModel {
	static async getAllInfoServicios(page = 1, limit = 10, filtroNombre = "") {
		const queryGetInfoServicios = `SELECT 
    s.*, 
    p.uuidPeticion, 
    maq.uuidMaquina,
    -- Agrupamos los puertos en un objeto JSON para que cada servicio sea una sola fila
    puertos_agg.lista_puertos
FROM 
    medal.servicio s, 
    medal.peticion p, 
    medal.maquina maq, 
    medal.corre c,
    (
        -- Subconsulta para agrupar los puertos antes de unir con el resto
        SELECT idServicio, 
               json_agg(json_build_object(
                   'id', idPuerto, 
                   'puerto', numeroPuertoMaquina, 
                   'protocolo', protocolo,
                   'nombre', nombreServicio
               )) AS lista_puertos
        FROM medal.puertosAbiertos
        GROUP BY idServicio
    ) AS puertos_agg
WHERE 
    s.idPeticion = p.idPeticion 
    AND c.idServicio = s.idServicio 
    AND maq.idMaquina = c.idMaquina
    AND s.idServicio = puertos_agg.idServicio AND nombreservicio ILIKE $3 ORDER BY nombreservicio ASC LIMIT $1 OFFSET $2;`;
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;

			const res = await pool.query(queryGetInfoServicios, [
				limit,
				offset,
				busqueda,
			]);
			return res.rows[0];
		} catch (error) {
			console.error(
				"Un error ha ocurrido cuando se hacía un get de todos los servicios.",
				error,
			);
			throw error;
		}
	}
}
export default ServiciosModel;
