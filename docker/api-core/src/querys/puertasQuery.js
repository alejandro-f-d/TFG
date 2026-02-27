export const PUERTAS_QUERY = {
	POST_PUERTA: `INSERT INTO medal.puertas(nombre, ubicacion, uuidPuerta) VALUES($1, $2, $3)`,
	GET_ALL_PAGINADO: `
    SELECT 
        p.*,
        -- Usuarios con acceso a esta puerta (incluyendo UUID)
        COALESCE(
            (SELECT json_agg(json_build_object(
                'uuid', u.uuidusuario,
                'nombre', u.nombre,
                'apellidos', CONCAT(u.apellido1, ' ', u.apellido2)
            ))
            FROM medal.accede a
            JOIN medal.usuario u ON a.idusuario = u.idusuario
            WHERE a.idpuerta = p.idpuerta
            ), '[]'
        ) AS usuarios_autorizados
    FROM medal.puertas p
    WHERE p.nombre ILIKE $3 OR p.ubicacion ILIKE $3
    ORDER BY p.idpuerta ASC
    LIMIT $1 OFFSET $2;`,
	GET_BY_UUID: `
    SELECT 
        p.*,
        -- Usuarios con acceso a esta puerta (incluyendo UUID)
        COALESCE(
            (SELECT json_agg(json_build_object(
                'uuid', u.uuidusuario,
                'nombre', u.nombre,
                'apellidos', CONCAT(u.apellido1, ' ', u.apellido2)
            ))
            FROM medal.accede a
            JOIN medal.usuario u ON a.idusuario = u.idusuario
            WHERE a.idpuerta = p.idpuerta
            ), '[]'
        ) AS usuarios_autorizados
    FROM medal.puertas p
    WHERE p.uuidpuerta = $1;`,
	OBTENER_ID: `SELECT idpuerta FROM medal.puertas WHERE uuidpuerta = $1;`,
	DELETE_USER_ASOCIADO: `DELETE FROM medal.accede WHERE idpuerta = $1;`,
	DELETE_PUERTA: `DELETE FROM medal.puertas WHERE uuidpuerta = $1`,
};
