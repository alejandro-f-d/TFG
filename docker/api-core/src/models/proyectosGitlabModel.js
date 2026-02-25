import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";

class ProyectosGitlabModel {
	static async postProyectoGitlab(data) {
		const {
			nombre,
			descripcion,
			fechaInicio,
			fechaFin,
			activo,
			participantes,
		} = data;
		const queryPostProyectoGitlab = `INSERT INTO medal.proyectosgitlab(nombre, descripcion, uuidProyecto, fechainicio, fechafin, activo) VALUES($1, $2, $3, $4, $5, $6) RETURNING idProyecto;`;
		const client = await pool.connect();
		try {
			const uuid = uuidv4();
			const valuesQueryPost = [
				nombre,
				descripcion,
				uuid,
				fechaInicio,
				fechaFin,
				activo,
			];
			await client.query("BEGIN");
			const resCreateProyecto = await client.query(
				queryPostProyectoGitlab,
				valuesQueryPost,
			);
			const idProyecto = resCreateProyecto.rows[0].idproyecto;
			if (Array.isArray(data.participantes)) {
				const queryAddParticipante = `INSERT INTO medal.participa(idusuario, idproyecto) VALUES($1, $2);`;
				for (const participanteId of data.participantes) {
					await client.query(queryAddParticipante, [
						participanteId,
						idProyecto,
					]);
				}
			}
			await client.query("COMMIT");
			return { status: "OK", uuid: uuid };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Ha ocurrido un error al hacer el post de un proyecto de gitlab.",
				data,
				error,
			);
			throw error;
		} finally {
			client.release();
		}
	}

	static async getAllProyects(page, limit, filtroNombre) {
		const offset = (page - 1) * limit;
		const busqueda = `%${filtroNombre}%`;
		const query = `SELECT 
    g.*, 
    json_agg(
        json_build_object(
            'idUsuario', u.idusuario,
            'nombre', u.nombre,
            'apellidos', u.apellido1 || ' ' || COALESCE(u.apellido2, '')
        )
    ) AS participantes
FROM 
    medal.proyectosgitlab g
INNER JOIN medal.participa p ON g.idproyecto = p.idproyecto
INNER JOIN medal.usuario u ON p.idusuario = u.idusuario
WHERE 
    g.nombre ILIKE $3
GROUP BY 
    g.idproyecto
ORDER BY 
    g.idproyecto ASC
LIMIT $1 OFFSET $2;`;

		try {
			const res = await pool.query(query, [limit, offset, busqueda]);
			const countQuery = `SELECT COUNT(*) FROM medal.proyectosgitlab WHERE nombre ILIKE $1;`;
			const countRes = await pool.query(countQuery, [busqueda]);
			const totalItems = parseInt(countRes.rows[0].count);
			return {
				status: "OK",
				rows: res.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
					totalItems: totalItems,
				},
			};
		} catch (error) {
			console.error(
				"Error al hacer un get de all proyects.",
				page,
				limit,
				filtroNombre,
				error,
			);
			throw error;
		}
	}
	static async getProyectoGitlabByUuid(uuidProyecto) {
    const query = `
        SELECT 
            g.idproyecto,
            g.nombre,
            g.descripcion,
            g.uuidproyecto,
            g.fechainicio,
            g.fechafin,
            g.activo,
            -- Usamos FILTER para evitar que devuelva [null] si no hay participantes
            COALESCE(
                json_agg(
                    json_build_object(
                        'idUsuario', u.idusuario,
                        'nombre', u.nombre,
                        'apellidos', u.apellido1 || ' ' || COALESCE(u.apellido2, '')
                    )
                ) FILTER (WHERE u.idusuario IS NOT NULL), 
                '[]'
            ) AS participantes
        FROM 
            medal.proyectosgitlab g
        LEFT JOIN medal.participa p ON g.idproyecto = p.idproyecto
        LEFT JOIN medal.usuario u ON p.idusuario = u.idusuario
        WHERE 
            g.uuidproyecto = $1
        GROUP BY 
            g.idproyecto;
    `;

    try {
        const res = await pool.query(query, [uuidProyecto]);
        return res.rows[0]; 
    } catch (error) {
        console.error("Error en getProyectoGitlabByUuid:", error);
        throw error;
    }
	}
}

export default ProyectosGitlabModel;
