import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
class ServerModel {
	static async postMaquina(datos) {
		const uuidMaquina = uuidv4();
		const queryServerPost = `
        INSERT INTO medal.maquina(
            uuidMaquina, nombre, caducidadssl, certificadosslactivo, emisorssl, 
            direccionipprivadav4, direccionippublicav4, direccionipprivadav6, 
            direccionippublicav6, puertaenlacev4, puertaenlacev6, ram, 
            sistemaoperativo, esservidor
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;

		const queryCrearPermisos = `
        INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) 
        VALUES 
        ($1, 'Ver servicios', 'Ver servicios asociados a la máquina', 'servicios'),
        ($2, 'Crear servicios', 'Permite la creación de servicios en esta máquina', 'servicios'),
        ($3, 'Eliminar servicios', 'Eliminar servicios asociados a la máquina', 'servicios');`;

		const valuesAlias = [
			`maquina:verServicios:${uuidMaquina}`,
			`maquina:crearServicios:${uuidMaquina}`,
			`maquina:borrarServicios:${uuidMaquina}`,
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

			await client.query(queryServerPost, valuesPostServer);
			if (datos.especificaciones.esServidor)
				await client.query(queryCrearPermisos, valuesAlias);

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
		let query = `SELECT * FROM medal.maquina`;
		let conditions = [];
		const params = [];
		if (soloServidores) {
			conditions.push(`esservidor = true`);
		}
		if (filtroNombre) {
			params.push(`%${filtroNombre}%`);
			conditions.push(`nombre ILIKE $${params.length}`);
		}
		if (conditions.length > 0) {
			query += ` WHERE ` + conditions.join(" AND ");
		}
		const offset = (page - 1) * limit;
		params.push(limit);
		query += ` LIMIT $${params.length}`;
		params.push(offset);
		query += ` OFFSET $${params.length}`;
		try {
			const res = await pool.query(query, params);
			return res.rows;
		} catch (error) {
			console.error("Error en getMaquinas Model:", error.message);
			throw error;
		}
	}

	static async getMaquina(soloServidores, uuid) {
		const verificarTipo = `SELECT * FROM medal.maquina WHERE uuidmaquina = $1;`;

		try {
			const resQuery = await pool.query(verificarTipo, [uuid]);
			if (resQuery.rows.length === 0) {
				return 2; //404 NOT FOUND
			} else if (resQuery.rows[0].esservidor) {
				return resQuery.rows[0];
			} else if (!resQuery.rows[0].esservidor && !soloServidores) {
				return resQuery.rows[0];
			} else {
				return 3; // 403 No tienes permisos.
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
		const queryDeletePerms = `DELETE FROM medal.permisos WHERE alias ILIKE $1`;
		const queryDeleteMaquina = `DELETE FROM medal.maquina WHERE uuidmaquina = $1`;
		try {
			const filtroPermiso = `%${uuid}%`;
			await pool.query(queryDeletePerms, [filtroPermiso]);
			const resBorrado = await pool.query(queryDeleteMaquina, [uuid]);
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
		const queryVerificarMaquinaExiste = `SELECT uuidMaquina FROM medal.maquina WHERE uuidMaquina = $1;`;

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
    AND s.idServicio = puertos_agg.idServicio
    AND maq.uuidMaquina = $4
    AND nombreservicio ILIKE $3 ORDER BY nombreservicio ASC LIMIT $1 OFFSET $2;`;
		try {
			const resExisteMaquina = await pool.query(queryVerificarMaquinaExiste, [
				uuid,
			]);
			if (resExisteMaquina.rows.length === 0) {
				return 2;
			}
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;

			const res = await pool.query(queryGetInfoServicios, [
				limit,
				offset,
				busqueda,
				uuid,
			]);
			return res.rows[0];
		} catch (error) {
			console.error(
				"Error inesparado al obtener los servicios de un servidor en concreto.",
			);
			throw error;
		}
	}
}
export default ServerModel;
