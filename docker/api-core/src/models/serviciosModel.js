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
	static async postServicio(uuidMaquina, datos) {
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

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const queryGetIdServidor = `SELECT idmaquina FROM medal.maquina WHERE uuidmaquina = $1`;
			const resIdMaq = await client.query(queryGetIdServidor, [uuid]); // IMPORTANTE: Usar client, no pool

			if (resIdMaq.rows.length === 0) {
				throw new Error("La máquina principal no existe.");
			}
			const idMaquinaPrincipal = resIdMaq.rows[0].idmaquina;

			const queryPostServicio = `
        INSERT INTO medal.servicio(nombreServicio, descripcionTecnica, entorno, publico, softwareBase, activo, nivelSeveridad, idUsuario, idPeticion, uuidservicio) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING idservicio;
    `;
			const resServicio = await client.query(queryPostServicio, [
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

			const queryInsertarServer = `INSERT INTO medal.corre(idServicio, idMaquina) VALUES($1, $2);`;
			for (const idMaq of listaMaquinas) {
				await client.query(queryInsertarServer, [idServicio, idMaq]);
			}

			const queryInsertarPuertos = `
        INSERT INTO medal.puertosabiertos(numeroPuertoMaquina, protocolo, nombreServicio, puertovirtual, idservicio) 
        VALUES($1, $2, $3, $4, $5);
    `;
			for (const puerto of puertosAbiertos) {
				await client.query(queryInsertarPuertos, [
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
			console.error("Error en postServicio:", error.message);
			throw error;
		} finally {
			client.release();
		}
	}
}
export default ServiciosModel;
