export const HEALTH_QUERYES = {
	HISTORICO_POST: `
        INSERT INTO medal.historicoMonitoreo (disponible, resultado, idMonitor) 
        VALUES ($1, $2, $3)
    `,

	MONITOR_WEB: `
        UPDATE medal.monitoreoWeb 
        SET valorUltimaRespuesta = $1, 
            fechaVerificacion = NOW(),
            -- Si disponible ($2) es true, reseteamos a 0. Si es false, sumamos 1.
            contadorFallos = CASE WHEN $2 = TRUE THEN 0 ELSE contadorFallos + 1 END
        WHERE idMonitor = $3 
        RETURNING *;
    `,

	GET_CORREOS_SUSCRITOS: `
        SELECT u.correoinstitucional 
        FROM medal.usuario u 
        INNER JOIN medal.suscripcionHistorico sh ON u.idusuario = sh.idusuario 
        WHERE sh.idmonitor = $1
    `,

	SET_CAIDO: `UPDATE medal.monitoreoweb SET statusactual = 'caido' WHERE idmonitor = $1;`,

	SET_OK: `UPDATE medal.monitoreoweb SET statusactual = 'ok' WHERE idmonitor = $1;`,
};
