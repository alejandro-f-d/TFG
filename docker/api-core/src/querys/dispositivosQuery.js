export const DISPOSITIVOS_QUERY = {
	POST_QUERY: `INSERT INTO medal.dispositivos(nombre, puntomontaje, capacidad, capacidadusada, tecnologia, uuiddispositivo, idmaquina, idtipodispositivo) VALUES($1, $2, $3, $4, $5, $6, $7, $8);`,
	GET_ALL_PAGINADO: `
        SELECT 
            d.*, 
            t.nombre AS tipo_dispositivo_nombre
        FROM medal.dispositivos d
        JOIN medal.tipodispositivo t ON d.idtipodispositivo = t.idtipodispositivo
        WHERE d.nombre ILIKE $3
        ORDER BY d.iddispositivo ASC
        LIMIT $1 OFFSET $2;
    `,
	GET_BY_UUID: `
    SELECT 
        d.*, 
        t.nombre AS tipo_dispositivo_nombre
    FROM medal.dispositivos d
    JOIN medal.tipodispositivo t ON d.idtipodispositivo = t.idtipodispositivo
    WHERE d.uuiddispositivo = $1;
	`,
};
