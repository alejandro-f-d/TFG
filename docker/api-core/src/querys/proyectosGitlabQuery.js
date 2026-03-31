export const PROYECTOS_QUERY = {
	POST: `INSERT INTO medal.proyectosgitlab(nombre, descripcion, uuidproyecto, fechainicio, fechafin, activo) VALUES($1, $2, $3, $4, $5, $6) RETURNING idproyecto;`,

	GET_ALL_PROYECTS: `
    SELECT g.*, 
    COALESCE(
        json_agg(
            json_build_object(
                'idUsuario', u.idusuario,
                'nombre', u.nombre,
                'apellidos', u.apellido1 || ' ' || COALESCE(u.apellido2, ''),
                'fotoperfil', u.fotoperfil 
            )
        ) FILTER (WHERE u.idusuario IS NOT NULL), 
        '[]'
    ) AS participantes
    FROM medal.proyectosgitlab g
    LEFT JOIN medal.participa p ON g.idproyecto = p.idproyecto
    LEFT JOIN medal.usuario u ON p.idusuario = u.idusuario
    WHERE g.nombre ILIKE $3
    GROUP BY g.idproyecto
    ORDER BY g.idproyecto ASC
    LIMIT $1 OFFSET $2;`,

	COUNT_NOMBRE: `SELECT COUNT(*) FROM medal.proyectosgitlab WHERE nombre ILIKE $1;`,

	GET_PROYECTO_UUID: `
        SELECT g.*,
        COALESCE(json_agg(
            json_build_object(
                'idUsuario', u.idusuario,
                'nombre', u.nombre,
                'apellidos', u.apellido1 || ' ' || COALESCE(u.apellido2, '')
            )
        ) FILTER (WHERE u.idusuario IS NOT NULL), '[]') AS participantes
        FROM medal.proyectosgitlab g
        LEFT JOIN medal.participa p ON g.idproyecto = p.idproyecto
        LEFT JOIN medal.usuario u ON p.idusuario = u.idusuario
        WHERE g.uuidproyecto = $1
        GROUP BY g.idproyecto;`,

	GET_ID_PROYECTO: `SELECT idproyecto FROM medal.proyectosgitlab WHERE uuidproyecto = $1;`,

	UPDATE_PROYECTO_GITLAB: (columns) => {
		const setClause = columns
			.map((col, index) => `${col} = $${index + 1}`)
			.join(", ");
		return `UPDATE medal.proyectosgitlab SET ${setClause} WHERE uuidproyecto = $${columns.length + 1} RETURNING idproyecto;`;
	},

	DELETE_PARTICIPANTES: `DELETE FROM medal.participa WHERE idproyecto = $1;`,

	INSERT_PARTICIPANTE: `INSERT INTO medal.participa (idusuario, idproyecto) VALUES ($1, $2);`,

	ADD_PARTICIPANTE: `INSERT INTO medal.participa (idusuario, idproyecto) VALUES ($1, $2);`,
};
