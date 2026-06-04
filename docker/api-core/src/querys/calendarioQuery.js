export const CALENDAR_QUERY = {
	GET_CALENDARIO_ALL: `
        SELECT 
            rc.idcalendario,
            rc.uuidcalendario,
            rc.nombre AS nombre_reserva,
            rc.descripcion,
            rc.fechainicio,
            rc.fechafin,
            u.uuidusuario,
            COALESCE(
                CONCAT_WS(' ', u.nombre, u.apellido1, u.apellido2),
                'Sin usuario'
            ) AS nombre_completo_usuario,
            COALESCE(m.nombre, 'Sin máquina') AS nombre_maquina,
            COUNT(*) OVER() AS total_registros
        FROM medal.reservacalendario rc
        LEFT JOIN medal.usuario u ON u.idusuario = rc.idusuario
        LEFT JOIN medal.maquina m ON m.idmaquina = rc.idmaquina
        WHERE (
            ($3::TEXT IS NULL OR rc.nombre ILIKE $3 OR u.nombre ILIKE $3 OR m.nombre ILIKE $3)
        )
        AND (
            -- Si no se pasan fechas, no filtra. Si se pasan, busca solapamientos.
            ($4::TIMESTAMP IS NULL OR rc.fechafin >= $4)
            AND 
            ($5::TIMESTAMP IS NULL OR rc.fechainicio <= $5)
        )
        ORDER BY rc.fechainicio DESC
        LIMIT $1 OFFSET $2;
    `,
	GET_MAQUINA_ID: `SELECT idmaquina FROM medal.maquina WHERE uuidmaquina = $1 AND esservidor = true;`,
	GET_USER_ID: `SELECT idusuario FROM medal.usuario WHERE uuidusuario = $1;`,
	POST_RESERVA: `INSERT INTO medal.reservacalendario(fechainicio, nombre, descripcion, fechafin, idusuario, idmaquina, uuidcalendario) VALUES($1, $2, $3, $4, $5, $6, $7);`,
	GET_RESERVA_CON_PERMISO: `
    SELECT 
        rc.idcalendario,
        rc.uuidcalendario,
        rc.nombre AS nombre_reserva,
        rc.descripcion,
        rc.fechainicio,
        rc.fechafin,
        m.nombre AS nombre_maquina,
        m.uuidmaquina,
        u.uuidusuario AS uuid_responsable,
        u.idusuario AS id_responsable,
        TRIM(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellido1, '') || ' ' || COALESCE(u.apellido2, '')) AS nombre_completo_responsable
        FROM medal.reservacalendario rc
        INNER JOIN medal.maquina m ON m.idmaquina = rc.idmaquina
        LEFT JOIN medal.usuario u ON u.idusuario = rc.idusuario
        WHERE rc.uuidcalendario = $1
        AND (
            -- CASO 1: Es el dueño
            rc.idusuario = $2 
            OR 
            -- CASO 2: Tiene permisos (Admin o Específico)
            EXISTS (
                SELECT 1 
                FROM medal.rolesTiene rt
                INNER JOIN medal.operaCon oc ON oc.idRole = rt.idRole
                INNER JOIN medal.permisos p ON p.idPermiso = oc.idPermiso
                WHERE rt.idUsuario = $2 
                AND (
                    p.alias = 'admin:total' 
                    OR 
                    p.alias = CONCAT('maquina:calendario:', m.uuidmaquina)
                )
            )
        );
    `,
	DELETE_RESERVA_SEGURA: `
        DELETE FROM medal.reservacalendario
        WHERE uuidcalendario = $1
        AND (
            -- Condición A: El usuario que solicita es el dueño
            idusuario = $2 
            OR 
            -- Condición B: El usuario que solicita tiene el permiso admin:total
            EXISTS (
                SELECT 1 
                FROM medal.rolesTiene rt
                INNER JOIN medal.operaCon oc ON oc.idRole = rt.idRole
                INNER JOIN medal.permisos p ON p.idPermiso = oc.idPermiso
                WHERE rt.idUsuario = $2 AND p.alias = 'admin:total'
            )
        )
        RETURNING uuidcalendario;
    `,
	GET_RESERVAS_MAQUINA: `
    SELECT 
        rc.idcalendario,
        rc.uuidcalendario,
        rc.nombre AS nombre_reserva,
        rc.descripcion,
        rc.fechainicio,
        rc.fechafin,
        m.uuidmaquina,
        m.nombre AS nombre_maquina, 
        u.uuidusuario AS uuid_responsable,
        u.idusuario AS id_responsable,
        TRIM(CONCAT(u.nombre, ' ', u.apellido1, ' ', u.apellido2)) AS nombre_completo_responsable
    FROM medal.reservacalendario rc
    INNER JOIN medal.maquina m ON m.idmaquina = rc.idmaquina
    LEFT JOIN medal.usuario u ON u.idusuario = rc.idusuario
    WHERE m.uuidmaquina = $1
    -- FILTRO DE FECHAS: Trae eventos que se solapen con el rango solicitado
    AND rc.fechainicio <= $4 
    AND rc.fechafin >= $3    
    AND (
        rc.idusuario = $2 
        OR 
        EXISTS (
            SELECT 1 
            FROM medal.rolesTiene rt
            INNER JOIN medal.operaCon oc ON oc.idRole = rt.idRole
            INNER JOIN medal.permisos p ON p.idPermiso = oc.idPermiso
            WHERE rt.idUsuario = $2 
            AND (
                p.alias = 'admin:total' 
                OR 
                p.alias = 'maquina:calendario:' || m.uuidmaquina
            )
        )
    )
    ORDER BY rc.fechainicio ASC;
    `,
	GET_NOMBRE_MAQUINA: `select nombre from medal.maquina where uuidmaquina = $1;`,
	VERIFICAR_EXISTE_RESERVA: `
        SELECT 1 FROM medal.reservacalendario WHERE uuidcalendario = $1
    `,
	OBTENER_ID_CREADOR: `select idusuario from medal.reservacalendario where uuidcalendario = $1;`,

	UPDATE_RESERVA_DYNAMIC: (keys) => {
		// Mapea los campos: nombre = $3, descripcion = $4, etc.
		const setClause = keys.map((key, i) => `${key} = $${i + 3}`).join(", ");

		return `
            UPDATE medal.reservacalendario
            SET ${setClause}
            WHERE uuidcalendario = $1
            AND (
                idusuario = $2 -- Es el dueño (Dueño OR Admin)
                OR EXISTS (
                    SELECT 1 FROM medal.rolesTiene rt
                    INNER JOIN medal.operaCon oc ON oc.idRole = rt.idRole
                    INNER JOIN medal.permisos p ON p.idPermiso = oc.idPermiso
                    WHERE rt.idUsuario = $2 AND p.alias = 'admin:total'
                )
            )
            RETURNING uuidcalendario;
        `;
	},
};
