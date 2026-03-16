export const HEALTH_QUERYES = {
	HISTORICO_POST: `
        INSERT INTO medal.historicoMonitoreo (disponible, resultado, idMonitor) 
        VALUES ($1, $2, $3)
    `,

	MONITOR_WEB: `
        UPDATE medal.monitoreoWeb 
        SET valorUltimaRespuesta = $1, 
            fechaVerificacion = NOW(),
            contadorFallos = CASE WHEN $2 = TRUE THEN 0 ELSE contadorFallos + 1 END
        WHERE idMonitor = $3 
        RETURNING contadorFallos, umbralReintentos, nombreObjetivo, direccion
    `,

	GET_CORREO: `
        SELECT u.correoinstitucional 
        FROM medal.usuario u 
        INNER JOIN medal.monitoreoweb mw ON u.idusuario = mw.idusuario 
        WHERE mw.idmonitor = $1
    `,
};
