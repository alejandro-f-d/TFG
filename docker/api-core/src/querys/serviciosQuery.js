export const SERVICIOS_QUERIES = {
	GET_ALL_INFO: `
        SELECT 
        s.*, 
        p.uuidpeticion, 
        maquinas_agg.lista_maquinas,
        COALESCE(puertos_agg.lista_puertos, '[]') AS lista_puertos,
        COUNT(*) OVER() AS total_count
        FROM medal.servicio s
        JOIN medal.peticion p ON s.idpeticion = p.idpeticion
        -- Subconsulta para agrupar máquinas y evitar duplicados de filas
        JOIN (
        SELECT 
                c.idservicio, 
                json_agg(maq.uuidmaquina) AS lista_maquinas
        FROM medal.corre c
        JOIN medal.maquina maq ON c.idmaquina = maq.idmaquina
        GROUP BY c.idservicio
        ) AS maquinas_agg ON s.idservicio = maquinas_agg.idservicio
        -- Tu lógica de puertos ya agrupada (mejorada con COALESCE)
        LEFT JOIN (
        SELECT 
                idservicio, 
                json_agg(json_build_object(
                'id', idpuerto, 
                'puerto', numeropuertomaquina, 
                'protocolo', protocolo, 
                'nombre', nombreservicio
                )) AS lista_puertos
        FROM medal.puertosabiertos
        GROUP BY idservicio
        ) AS puertos_agg ON s.idservicio = puertos_agg.idservicio
        WHERE s.nombreservicio ILIKE $3 
        AND s.status ILIKE $4 
        ORDER BY s.nombreservicio ASC 
        LIMIT $1 OFFSET $2;`,

	GET_ID_MAQUINA: `SELECT idmaquina FROM medal.maquina WHERE uuidmaquina = $1;`,

	POST_SERVICIO: `
        INSERT INTO medal.servicio(nombreservicio, descripciontecnica, entorno, publico, softwarebase, nivelseveridad, idusuario, idpeticion, uuidservicio) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING idservicio;`,

	INSERT_CORRE: `INSERT INTO medal.corre(idservicio, idmaquina) VALUES($1, $2);`,

	INSERT_PUERTO: `
        INSERT INTO medal.puertosabiertos(numeropuertomaquina, protocolo, nombreservicio, puertovirtual, idservicio) 
        VALUES($1, $2, $3, $4, $5);`,

	GET_BY_UUID_COMPLETO: `
        SELECT s.*, p.uuidpeticion, maq.uuidmaquina, COALESCE(puertos_agg.lista_puertos, '[]'::json) AS lista_puertos
        FROM medal.servicio s
        INNER JOIN medal.peticion p ON s.idpeticion = p.idpeticion
        INNER JOIN medal.corre c ON c.idservicio = s.idservicio
        INNER JOIN medal.maquina maq ON c.idmaquina = maq.idmaquina
        LEFT JOIN (
            SELECT idservicio, json_agg(json_build_object(
                'id', idpuerto, 'puerto', numeropuertomaquina, 
                'protocolo', protocolo, 'nombre', nombreservicio
            )) AS lista_puertos
            FROM medal.puertosabiertos
            GROUP BY idservicio
        ) AS puertos_agg ON s.idservicio = puertos_agg.idservicio
        WHERE s.uuidservicio = $1 AND maq.idmaquina = $2;`,

	VERIFICAR_RELACION: `
        SELECT s.idservicio, maq.idmaquina 
        FROM medal.servicio s
        JOIN medal.corre c ON s.idservicio = c.idservicio
        JOIN medal.maquina maq ON maq.idmaquina = c.idmaquina
        WHERE s.uuidservicio = $1 AND maq.uuidmaquina = $2;`,

	DELETE_CORRE: `DELETE FROM medal.corre WHERE idservicio = $1;`,
	DELETE_PUERTOS: `DELETE FROM medal.puertosabiertos WHERE idservicio = $1;`,
	DELETE_SERVICIO: `DELETE FROM medal.servicio WHERE idservicio = $1;`,

	UPDATE_DYNAMIC: (keys) => {
		const setClause = keys
			.map((key, index) => `${key} = $${index + 1}`)
			.join(", ");
		return `UPDATE medal.servicio SET ${setClause} WHERE uuidservicio = $${keys.length + 1};`;
	},
};
