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
	DELETE_BY_UUID: `DELETE FROM medal.dispositivos WHERE uuiddispositivo = $1`,
	UPDATE_DISPOSITIVO: (columns) => {
		const setClause = columns
			.map((col, index) => `${col} = $${index + 1}`)
			.join(", ");
		return `UPDATE medal.dispositivos SET ${setClause} WHERE uuiddispositivo = $${columns.length + 1};`;
	},
	GET_TIPOS: `SELECT COALESCE(
        json_agg(
            json_build_object(
                'nombre', nombre,
                'descripcion', descripcion
            )
        ), 
        '[]'
    ) AS tipos_dispositivo
    FROM medal.tipodispositivo;`,
};
