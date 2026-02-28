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
};
