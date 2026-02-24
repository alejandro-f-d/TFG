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
			const resIdMaq = await client.query(queryGetIdServidor, [uuidMaquina]);

			if (resIdMaq.rows.length === 0) {
				return 2;
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
	static async getServicioByUuid(uuidMaquina, uuidServicio) {
		const queryGetServicioByUuid = `
        SELECT 
            s.*, 
            p.uuidPeticion, 
            maq.uuidMaquina,
            COALESCE(puertos_agg.lista_puertos, '[]'::json) AS lista_puertos
        FROM medal.servicio s
        INNER JOIN medal.peticion p ON s.idPeticion = p.idPeticion
        INNER JOIN medal.corre c ON c.idServicio = s.idServicio
        INNER JOIN medal.maquina maq ON c.idMaquina = maq.idMaquina
        LEFT JOIN (
            SELECT idServicio, 
                   json_agg(json_build_object(
                       'id', idPuerto, 
                       'puerto', numeroPuertoMaquina, 
                       'protocolo', protocolo,
                       'nombre', nombreServicio
                   )) AS lista_puertos
            FROM medal.puertosAbiertos
            GROUP BY idServicio
        ) AS puertos_agg ON s.idServicio = puertos_agg.idServicio
        WHERE s.uuidservicio = $1 AND c.idmaquina = $2;
    `;

		const queryGetIdServidor = `SELECT idmaquina FROM medal.maquina WHERE uuidmaquina = $1;`;
		const client = await pool.connect();

		try {
			const resIdMaq = await client.query(queryGetIdServidor, [uuidMaquina]);

			if (resIdMaq.rows.length === 0) return 2; // Máquina no existe

			const idMaquinaPrincipal = resIdMaq.rows[0].idmaquina;
			const resDevolver = await client.query(queryGetServicioByUuid, [
				uuidServicio,
				idMaquinaPrincipal,
			]);

			if (resDevolver.rows.length === 0) return 3; // Servicio no encontrado para esa máquina

			return resDevolver.rows[0];
		} catch (error) {
			console.error("Error en getServicioByUuid Model:", error);
			throw error;
		} finally {
			client.release();
		}
	}
	static async deleteServicioByUuid(uuidMaquina, uuidServicio) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const queryVerificar = `
			SELECT s.idservicio, maq.idmaquina 
			FROM 
    			medal.servicio s, 
    			medal.corre c, 
    			medal.maquina maq
			WHERE 
    			s.idservicio = c.idservicio 
    			AND maq.idmaquina = c.idmaquina 
    			AND s.uuidservicio = $1 
    			AND maq.uuidmaquina = $2;
        `;

			const resVerificar = await client.query(queryVerificar, [
				uuidServicio,
				uuidMaquina,
			]);
			if (resVerificar.rows.length === 0) {
				await client.query("ROLLBACK");
				return 2;
			}
			const idServicio = resVerificar.rows[0].idservicio;
			const queryDeleteCorre = `DELETE FROM medal.corre WHERE idservicio = $1`;
			await client.query(queryDeleteCorre, [idServicio]);
			const queryDeletePuertos = `DELETE FROM medal.puertosabiertos WHERE idservicio = $1`;
			await client.query(queryDeletePuertos, [idServicio]);
			const queryDeleteServicio = `DELETE FROM medal.servicio WHERE idservicio = $1`;
			const resDelete = await client.query(queryDeleteServicio, [idServicio]);
			await client.query("COMMIT");
			return resDelete.rowCount;
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Error en deleteServicioByUuid con verificación de máquina:",
				error.message,
			);
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
				if (camposPermitidos.includes(key)) {
					camposFiltrados[key] = camposServicio[key];
				}
			});

			const queryVerificacion = `
				SELECT c.idmaquina, c.idservicio 
				FROM medal.corre c, medal.maquina m, medal.servicio s 
				WHERE m.idmaquina = c.idmaquina 
				  AND s.idservicio = c.idservicio 
				  AND m.uuidmaquina = $1 
				  AND s.uuidservicio = $2;`;

			const resVerificacion = await client.query(queryVerificacion, [
				uuidMaquina,
				uuidServicio,
			]);

			if (resVerificacion.rowCount === 0) {
				await client.query("ROLLBACK");
				return 2;
			}

			const idServicio = resVerificacion.rows[0].idservicio;

			const keys = Object.keys(camposFiltrados);
			if (keys.length > 0) {
				const values = Object.values(camposFiltrados);
				const setQuery = keys
					.map((key, index) => `${key} = $${index + 1}`)
					.join(", ");

				values.push(uuidServicio);

				await client.query(
					`UPDATE medal.servicio SET ${setQuery} WHERE uuidservicio = $${values.length};`,
					values,
				);
			}

			if (servidores !== undefined) {
				await client.query("DELETE FROM medal.corre WHERE idservicio = $1;", [
					idServicio,
				]);

				if (Array.isArray(servidores)) {
					for (const servidorId of servidores) {
						await client.query(
							"INSERT INTO medal.corre(idservicio, idmaquina) VALUES($1, $2)",
							[idServicio, servidorId],
						);
					}
				}
			}

			if (puertosAbiertos !== undefined) {
				await client.query(
					"DELETE FROM medal.puertosabiertos WHERE idservicio = $1",
					[idServicio],
				);

				if (Array.isArray(puertosAbiertos)) {
					for (const puerto of puertosAbiertos) {
						await client.query(
							`INSERT INTO medal.puertosabiertos
							(numeropuertomaquina, protocolo, nombreservicio, puertovirtual, idservicio)
							VALUES ($1, $2, $3, $4, $5)`,
							[
								puerto.numeroPuertoMaquina,
								puerto.protocolo,
								puerto.nombreServicio,
								puerto.puertoVirtual,
								idServicio,
							],
						);
					}
				}
			}

			await client.query("COMMIT");
			return { status: "OK" };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Se ha producido un error al hacer el patch de un servicio:",
				error.message,
			);
			throw error;
		} finally {
			client.release();
		}
	}
}
export default ServiciosModel;
