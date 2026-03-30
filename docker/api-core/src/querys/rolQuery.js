export const ROL_QUERY = {
	GET_ID_USR: `SELECT idusuario FROM medal.usuario WHERE uuidusuario = $1`,
	POST_ROLE: `INSERT INTO medal.roles(nombre, descripcion, idusuario, uuidrole) 
            VALUES($1, $2, $3, $4) 
            RETURNING idrole;`,
	OBTENER_ID_ESPECIALES: `SELECT idpermiso, alias FROM medal.permisos WHERE alias IN ('null:null', 'admin:total');`,
	INSERT_OPERA_CON: `INSERT INTO medal.operacon(idrole, idpermiso) VALUES ($1, $2)`,
	GET_ROLES: `SELECT 
    r.*,
    -- Agregación de Usuarios
    COALESCE(
        (SELECT json_agg(json_build_object(
            'idUsuario', u.idusuario,
            'nombre', u.nombre,
            'apellido1', u.apellido1,
            'apellido2', u.apellido2
        ))
         FROM medal.rolestiene rt
         JOIN medal.usuario u ON rt.idusuario = u.idusuario
         WHERE rt.idrole = r.idrole
        ), '[]'
    ) AS usuarios,
    -- Agregación de Permisos
    COALESCE(
        (SELECT json_agg(json_build_object(
            'idPermiso', p.idpermiso,
            'nombre', p.nombre,
            'alias', p.alias
        ))
         FROM medal.operacon o
         JOIN medal.permisos p ON o.idpermiso = p.idpermiso
         WHERE o.idrole = r.idrole
        ), '[]'
    ) AS permisos
    FROM medal.roles r
    WHERE r.nombre ILIKE $3
    ORDER BY r.idrole ASC
    LIMIT $1 OFFSET $2;`,
	COUNT_ROLES: `SELECT COUNT(*) FROM medal.roles WHERE nombre ILIKE $1`,
	GET_ROLE_BY_UUID: `SELECT 
    r.*,
    (
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idUsuario', u.idusuario,
                    'nombre', u.nombre,
                    'apellido1', u.apellido1,
                    'apellido2', u.apellido2
                )
            ), '[]'
        )
        FROM medal.rolestiene rt
        JOIN medal.usuario u ON rt.idusuario = u.idusuario
        WHERE rt.idrole = r.idrole
    ) AS usuarios,
    (
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idPermiso', p.idpermiso,
                    'nombre', p.nombre,
                    'alias', p.alias,
                    'modulo', p.modulo
                )
            ), '[]'
        )
        FROM medal.operacon o
        JOIN medal.permisos p ON o.idpermiso = p.idpermiso
        WHERE o.idrole = r.idrole
    ) AS permisos
    FROM medal.roles r
    WHERE r.uuidrole = $1;`,
	OBTENER_ID_ROL: `SELECT idrole FROM medal.roles WHERE uuidrole = $1;`,
	BORRAR_PERTENCE: `DELETE FROM medal.rolestiene WHERE idrole = $1`,
	BORRAR_PERMISOS: `DELETE FROM medal.operacon WHERE idRole = $1;`,
	BORRAR_ROL: `DELETE from medal.roles WHERE uuidrole = $1;`,
	GET_ID_BY_UUID: `
        SELECT idrole FROM medal.roles WHERE uuidrole = $1;
    `,

	UPDATE_ROLE_DYNAMIC: (keys) => {
		const setClause = keys
			.map((key, index) => `${key} = $${index + 1}`)
			.join(", ");

		return `
            UPDATE medal.roles 
            SET ${setClause} 
            WHERE uuidrole = $${keys.length + 1} 
            RETURNING idrole;
        `;
	},

	DELETE_PERMISOS_ASIGNADOS: `
        DELETE FROM medal.operacon WHERE idrole = $1;
    `,
	INSERT_PERMISO_ROL: `
        INSERT INTO medal.operacon (idrole, idpermiso) 
        VALUES ($1, $2);
    `,
	BORRAR_OPERACON: `DELETE FROM medal.operaCon WHERE idRole = $1`,
	VERIFICAR_EXISTENCIA: `SELECT 1 FROM medal.operaCon WHERE idRole = $1 AND idPermiso = $2`,
};
