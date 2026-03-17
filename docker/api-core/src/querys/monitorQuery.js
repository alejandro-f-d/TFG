export const MONITOR_QUERY = {
	CREAR_MONITOR: `INSERT INTO medal.monitoreoweb(nombreobjetivo, direccion, valoresperado, uuidmonitoreo, timeoutsegundos, umbralreintentos, idusuario, idmetodo, cadacuantosegundos) values($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`,
	GET_MONITOR_UUID: `SELECT 
    m.uuidMonitoreo,
    m.nombreObjetivo,
    m.direccion,
    m.valorUltimaRespuesta,
    m.valorEsperado,
    m.contadorFallos,
    m.timeoutSegundos,
    m.cadaCuantoSegundos,
    m.fechaVerificacion,
    m.proxima_ejecucion,

    CONCAT(u.nombre, ' ', u.apellido1, ' ', COALESCE(u.apellido2, '')) AS responsable_nombre,
    u.correoinstitucional AS responsable_email,

    met.nombre AS metodo_http,

    h.disponible AS ultimo_estado_disponible,
    h.resultado AS ultimo_codigo_http,
    h.fecha_registro AS ultima_respuesta_fecha

FROM medal.monitoreoWeb m
JOIN medal.usuario u ON m.idUsuario = u.idUsuario
JOIN medal.metodoMonitoreoWeb met ON m.idMetodo = met.idMetodo
LEFT JOIN LATERAL (
    SELECT disponible, resultado, fecha_registro
    FROM medal.historicoMonitoreo
    WHERE idMonitor = m.idMonitor
    ORDER BY fecha_registro DESC
    LIMIT 1
) h ON TRUE
WHERE m.uuidmonitoreo = $1;`,
	GET_CREADOR: `SELECT idusuario from medal.monitoreoWeb where uuidmonitoreo = $1;`,
	DELETE_MONITOR_BY_UUID: `
        DELETE FROM medal.monitoreoWeb 
        WHERE uuidMonitoreo = $1
        RETURNING idMonitor;
  `,
	GET_ALL_MONITORES: `SELECT 
            m.uuidMonitoreo,
            m.nombreObjetivo,
            m.direccion,
            m.valorUltimaRespuesta,
            m.valorEsperado,
            m.contadorFallos,
            m.timeoutSegundos,
            m.cadaCuantoSegundos,
            m.fechaVerificacion,
            m.proxima_ejecucion,
            m.fechaCreacion,

            -- Datos del Responsable
            CONCAT(u.nombre, ' ', u.apellido1, ' ', COALESCE(u.apellido2, '')) AS responsable_nombre,
            u.correoinstitucional AS responsable_email,

            -- Método HTTP
            met.nombre AS metodo_http,

            -- Último estado (Lateral Join para eficiencia)
            h.disponible AS ultimo_estado_disponible,
            h.resultado AS ultimo_codigo_http,
            h.fecha_registro AS ultima_respuesta_fecha,

            -- Conteo total para el frontend
            COUNT(*) OVER() AS total_registros

        FROM medal.monitoreoWeb m
        JOIN medal.usuario u ON m.idUsuario = u.idUsuario
        JOIN medal.metodoMonitoreoWeb met ON m.idMetodo = met.idMetodo
        LEFT JOIN LATERAL (
            SELECT disponible, resultado, fecha_registro
            FROM medal.historicoMonitoreo
            WHERE idMonitor = m.idMonitor
            ORDER BY fecha_registro DESC
            LIMIT 1
        ) h ON TRUE
        
        WHERE ($3::text = '' OR m.nombreObjetivo ILIKE $4)
        
        ORDER BY m.fechaCreacion DESC
        
        LIMIT $1 OFFSET $2;`,
	GET_ALL_MONITORES_PROPIOS: `SELECT 
            m.uuidMonitoreo,
            m.nombreObjetivo,
            m.direccion,
            m.valorUltimaRespuesta,
            m.valorEsperado,
            m.contadorFallos,
            m.timeoutSegundos,
            m.cadaCuantoSegundos,
            m.fechaVerificacion,
            m.proxima_ejecucion,
            m.fechaCreacion,

            -- Datos del Responsable
            CONCAT(u.nombre, ' ', u.apellido1, ' ', COALESCE(u.apellido2, '')) AS responsable_nombre,
            u.correoinstitucional AS responsable_email,

            -- Método HTTP
            met.nombre AS metodo_http,

            -- Último estado (Lateral Join para eficiencia)
            h.disponible AS ultimo_estado_disponible,
            h.resultado AS ultimo_codigo_http,
            h.fecha_registro AS ultima_respuesta_fecha,

            -- Conteo total para el frontend
            COUNT(*) OVER() AS total_registros

        FROM medal.monitoreoWeb m
        JOIN medal.usuario u ON m.idUsuario = u.idUsuario
        JOIN medal.metodoMonitoreoWeb met ON m.idMetodo = met.idMetodo
        LEFT JOIN LATERAL (
            SELECT disponible, resultado, fecha_registro
            FROM medal.historicoMonitoreo
            WHERE idMonitor = m.idMonitor
            ORDER BY fecha_registro DESC
            LIMIT 1
        ) h ON TRUE
        
        WHERE ($3::text = '' OR m.nombreObjetivo ILIKE $4) AND m.idusuario = $5
        
        ORDER BY m.fechaCreacion DESC
        
        LIMIT $1 OFFSET $2;`,
	OBTENER_HISTORICO: ` SELECT 
             mw.idMonitor,
             mw.nombreObjetivo,
             mw.direccion,
             mw.statusActual,
             mm.nombre AS metodo,
             (
                 SELECT JSON_AGG(json_build_object(
                     'fecha', h.fecha_registro, 
                     'disponible', h.disponible,
                     'resultado', h.resultado
                 ) ORDER BY h.fecha_registro DESC)
                 FROM medal.historicoMonitoreo h
                 WHERE h.idMonitor = mw.idMonitor
             ) as historico
         FROM medal.monitoreoWeb mw
         INNER JOIN medal.metodoMonitoreoWeb mm ON mw.idMetodo = mm.idMetodo
         WHERE mw.uuidmonitoreo = $1;`,
};
