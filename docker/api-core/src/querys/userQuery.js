export const USER_QUERIES = {
	// Inserciones de relaciones
	INSERT_ROL_RELACION: `INSERT INTO medal.rolestiene(idrole, idusuario) VALUES($1, $2);`,
	INSERT_PUERTA_RELACION: `INSERT INTO medal.accede(idusuario, idpuerta) VALUES($1, $2);`,
	INSERT_MAQUINA_RELACION: `INSERT INTO medal.propietario(idusuario, idmaquina) VALUES($1, $2);`,

	// Borrado de relaciones
	DELETE_ROLES_USER: `DELETE FROM medal.rolestiene WHERE idusuario = $1;`,
	DELETE_PUERTAS_USER: `DELETE FROM medal.accede WHERE idusuario = $1;`,
	DELETE_MAQUINAS_USER: `DELETE FROM medal.propietario WHERE idusuario = $1;`,

	// Usuarios
	POST_USER: (conContrasena = false) => `
    INSERT INTO medal.usuario(
        nombre, apellido1, apellido2, teams, esresponsable, usuariovpn, 
        correoinstitucional, activo, fechaincorporacion, fechafin, wifi, 
        tarjetaacceso, uuidusuario, gitlab, responsable
        ${conContrasena ? ", contrasena" : ""}
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15 ${conContrasena ? ", $16" : ""}) 
    RETURNING uuidusuario, idusuario;`,

	GET_BY_UUID: `
    SELECT 
        u.*,
        -- Roles asociados al usuario
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', r.idrole,
                'nombre', r.nombre
            ))
            FROM medal.rolestiene rt
            JOIN medal.roles r ON rt.idrole = r.idrole
            WHERE rt.idusuario = u.idusuario
            ), '[]'
        ) AS roles,
        -- Peticiones asociadas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', p.idpeticion,
                'uuid', p.uuidpeticion,
                'proyecto', dp.nombreproyectoasociado,
                'estado', p.estado
            ))
            FROM medal.peticion p
            LEFT JOIN medal.detallepeticionacceso dp ON p.idpeticion = dp.idpetacceso
            WHERE p.usuariopeticion = u.idusuario
            ), '[]'
        ) AS peticiones,
        -- Acceso a Puertas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pu.idpuerta,
                'nombre', pu.nombre
            ))
            FROM medal.accede a
            JOIN medal.puertas pu ON a.idpuerta = pu.idpuerta
            WHERE a.idusuario = u.idusuario
            ), '[]'
        ) AS puertas,
        -- Máquinas en propiedad
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', m.idmaquina,
                'nombre', m.nombre
            ))
            FROM medal.propietario prop
            JOIN medal.maquina m ON prop.idmaquina = m.idmaquina
            WHERE prop.idusuario = u.idusuario
            ), '[]'
        ) AS maquinas_propiedad,
        -- Participación en Proyectos GitLab
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pg.idproyecto,
                'nombre', pg.nombre,
                'uuid', pg.uuidproyecto,
                'activo', pg.activo
            ))
            FROM medal.participa part
            JOIN medal.proyectosgitlab pg ON part.idproyecto = pg.idproyecto
            WHERE part.idusuario = u.idusuario
            ), '[]'
        ) AS proyectos_gitlab
    FROM medal.usuario u
    WHERE u.uuidusuario = $1;`,

	GET_ALL_PAGINADO: `
    SELECT 
        u.*,
        -- Roles asociados al usuario
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', r.idrole,
                'nombre', r.nombre
            ))
            FROM medal.rolestiene rt
            JOIN medal.roles r ON rt.idrole = r.idrole
            WHERE rt.idusuario = u.idusuario
            ), '[]'
        ) AS roles,
        -- Peticiones asociadas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', p.idpeticion,
                'uuid', p.uuidpeticion,
                'proyecto', dp.nombreproyectoasociado,
                'estado', p.estado
            ))
            FROM medal.peticion p
            LEFT JOIN medal.detallepeticionacceso dp ON p.idpeticion = dp.idpetacceso
            WHERE p.usuariopeticion = u.idusuario
            ), '[]'
        ) AS peticiones,
        -- Acceso a Puertas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pu.idpuerta,
                'nombre', pu.nombre
            ))
            FROM medal.accede a
            JOIN medal.puertas pu ON a.idpuerta = pu.idpuerta
            WHERE a.idusuario = u.idusuario
            ), '[]'
        ) AS puertas,
        -- Máquinas en propiedad
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', m.idmaquina,
                'nombre', m.nombre
            ))
            FROM medal.propietario prop
            JOIN medal.maquina m ON prop.idmaquina = m.idmaquina
            WHERE prop.idusuario = u.idusuario
            ), '[]'
        ) AS maquinas_propiedad,
        -- Participación en Proyectos GitLab
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pg.idproyecto,
                'nombre', pg.nombre,
                'uuid', pg.uuidproyecto,
                'activo', pg.activo
            ))
            FROM medal.participa part
            JOIN medal.proyectosgitlab pg ON part.idproyecto = pg.idproyecto
            WHERE part.idusuario = u.idusuario
            ), '[]'
        ) AS proyectos_gitlab
    FROM medal.usuario u
    WHERE u.nombre ILIKE $3 AND u.activo = $4
    ORDER BY u.idusuario ASC
    LIMIT $1 OFFSET $2;`,

	COUNT_BY_NOMBRE: `SELECT COUNT(*) FROM medal.usuario WHERE nombre ILIKE $1 AND activo = $2;`,

	GET_ID_BY_UUID: `SELECT idusuario FROM medal.usuario WHERE uuidusuario = $1;`,

	UPDATE_DYNAMIC: (keys) => {
		const setClause = keys
			.map((key, index) => `${key} = $${index + 1}`)
			.join(", ");
		return `UPDATE medal.usuario SET ${setClause} WHERE uuidusuario = $${keys.length + 1} RETURNING idusuario;`;
	},

	DAR_BAJA: `UPDATE medal.usuario SET activo = false WHERE uuidusuario = $1;`,

	GET_AUTH_DATA: `
        SELECT u.contrasena, u.uuidusuario, array_agg(perm.alias) AS permisos
        FROM medal.usuario u
        JOIN medal.rolestiene r ON u.idusuario = r.idusuario
        JOIN medal.operacon p ON r.idrole = p.idrole
        JOIN medal.permisos perm ON p.idpermiso = perm.idpermiso
        WHERE u.correoinstitucional = $1 AND u.activo = true
        GROUP BY u.idusuario, u.contrasena, u.uuidusuario;`,

	REGISTRAR_INTENTO_LOGIN: `INSERT INTO medal.intentosLogin(iporigen, emailintentado, exitoso) VALUES($1, $2, $3);`,

	UPDATE_LAST_IP: `UPDATE medal.usuario SET dirIpLastLogin = $1 WHERE correoInstitucional = $2;`,

	EXISTE_USER_CORREO_ELECTRONICO: `SELECT idusuario, nombre FROM medal.usuario WHERE correoinstitucional = $1;`,

	INVALIDAR_TOKENS_ANTERIORES: `UPDATE medal.recuperacionpassword SET usado = true WHERE idusuario = $1 AND usado = false`,

	AGREGAR_TOKEN: `INSERT INTO medal.recuperacionpassword(tokenhash, fechaexpiracion, idusuario) VALUES ($1, $2, $3);`,

	UPDATE_CONTRASENA_TOKEN: `
    WITH token_validado AS (
        UPDATE medal.recuperacionpassword
        SET usado = true, usedat = NOW()
        WHERE tokenhash = $1 AND usado = false AND fechaexpiracion > NOW()
        RETURNING idusuario
    )
    UPDATE medal.usuario
    SET contrasena = $2
    WHERE idusuario = (SELECT idusuario FROM token_validado)
    RETURNING idusuario;    `,
	CHECK_SPAM: `SELECT fechacreacion FROM medal.recuperacionpassword 
     WHERE idusuario = $1 
     ORDER BY fechacreacion DESC LIMIT 1`,
	INSERT_PHOTO: `UPDATE medal.usuario SET fotoperfil = $1 WHERE uuidusuario = $2;`,
	OBTENER_PASSWORD_UUID: `select contrasena FROM medal.usuario where uuidusuario = $1;`,
	UPDATE_PASSWORD: `update medal.usuario SET contrasena = $1 WHERE uuidusuario = $2;`,
	GET_ALL_PAGINADO_GITLAB: `SELECT 
        u.*,
        -- Roles asociados al usuario
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', r.idrole,
                'nombre', r.nombre
            ))
            FROM medal.rolestiene rt
            JOIN medal.roles r ON rt.idrole = r.idrole
            WHERE rt.idusuario = u.idusuario
            ), '[]'
        ) AS roles,
        -- Peticiones asociadas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', p.idpeticion,
                'uuid', p.uuidpeticion,
                'proyecto', dp.nombreproyectoasociado,
                'estado', p.estado
            ))
            FROM medal.peticion p
            LEFT JOIN medal.detallepeticionacceso dp ON p.idpeticion = dp.idpetacceso
            WHERE p.usuariopeticion = u.idusuario
            ), '[]'
        ) AS peticiones,
        -- Acceso a Puertas
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pu.idpuerta,
                'nombre', pu.nombre
            ))
            FROM medal.accede a
            JOIN medal.puertas pu ON a.idpuerta = pu.idpuerta
            WHERE a.idusuario = u.idusuario
            ), '[]'
        ) AS puertas,
        -- Máquinas en propiedad
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', m.idmaquina,
                'nombre', m.nombre
            ))
            FROM medal.propietario prop
            JOIN medal.maquina m ON prop.idmaquina = m.idmaquina
            WHERE prop.idusuario = u.idusuario
            ), '[]'
        ) AS maquinas_propiedad,
        -- Participación en Proyectos GitLab
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', pg.idproyecto,
                'nombre', pg.nombre,
                'uuid', pg.uuidproyecto,
                'activo', pg.activo
            ))
            FROM medal.participa part
            JOIN medal.proyectosgitlab pg ON part.idproyecto = pg.idproyecto
            WHERE part.idusuario = u.idusuario
            ), '[]'
        ) AS proyectos_gitlab
    FROM medal.usuario u
    WHERE u.nombre ILIKE $3 AND u.activo = $4 AND u.gitlab IS NOT NULL
    ORDER BY u.idusuario ASC
    LIMIT $1 OFFSET $2;`,
};
