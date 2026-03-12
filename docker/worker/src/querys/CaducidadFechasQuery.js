export const QUERIES_CADUCIDAD = {
	GET_TODO_CADUCIDAD_UNIFICADO: `
        SELECT json_agg(subquery) AS todo_junto
        FROM (
            /* SECCIÓN DE USUARIOS */
            SELECT 
                uuidusuario AS identificador_uuid, 
                CONCAT(nombre, ' ', apellido1, ' ', COALESCE(apellido2, '')) AS sujeto, 
                correoinstitucional, 
                'CUENTA_USUARIO' AS tipo_caducidad
            FROM medal.usuario
            WHERE fechafin::date = CURRENT_DATE

            UNION ALL

            /* SECCIÓN DE PETICIONES */
            SELECT 
                p.uuidpeticion AS identificador_uuid, 
                CONCAT(u.nombre, ' ', u.apellido1, ' ', COALESCE(u.apellido2, '')) AS sujeto, 
                u.correoinstitucional, 
                CONCAT('PETICION_', p.estado) AS tipo_caducidad
            FROM medal.peticion p
            JOIN medal.usuario u ON p.usuariopeticion = u.idusuario
            WHERE p.fechafin::date = CURRENT_DATE
        ) AS subquery;
    `,
	OBTENER_CORREO_ADMIN: `
    SELECT STRING_AGG(u.correoInstitucional, ', ') AS lista_destinatarios
    FROM medal.usuario u
    JOIN medal.rolesTiene rt ON u.idUsuario = rt.idUsuario
    JOIN medal.roles r ON rt.idRole = r.idRole
    JOIN medal.operaCon oc ON r.idRole = oc.idRole
    JOIN medal.permisos p ON oc.idPermiso = p.idPermiso
    WHERE p.alias = 'admin:total'
    AND u.activo = TRUE;
    `,
};
