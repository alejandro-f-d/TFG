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
            tarjetaacceso, uuidusuario, gitlab, responsable, jefelaboratorio
            ${conContrasena ? ', contrasena' : ''}
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16 ${conContrasena ? ', $17' : ''}) 
        RETURNING uuidusuario, idusuario;`,

    GET_BY_UUID: `SELECT * FROM medal.usuario WHERE uuidusuario = $1;`,

    GET_ALL_PAGINADO: `
        SELECT * FROM medal.usuario 
        WHERE nombre ILIKE $3 
        ORDER BY idusuario ASC 
        LIMIT $1 OFFSET $2;`,

    COUNT_BY_NOMBRE: `SELECT COUNT(*) FROM medal.usuario WHERE nombre ILIKE $1;`,

    GET_ID_BY_UUID: `SELECT idusuario FROM medal.usuario WHERE uuidusuario = $1;`,

    UPDATE_DYNAMIC: (keys) => {
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
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

    UPDATE_LAST_IP: `UPDATE medal.usuario SET dirIpLastLogin = $1 WHERE correoInstitucional = $2;`
};
