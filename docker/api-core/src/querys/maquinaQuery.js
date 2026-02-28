export const MAQUINA_QUERIES = {
	SERVER_POST: `
    INSERT INTO medal.maquina(
        uuidMaquina, nombre, caducidadssl, certificadosslactivo, emisorssl, 
        direccionipprivadav4, direccionippublicav4, direccionipprivadav6, 
        direccionippublicav6, puertaenlacev4, puertaenlacev6, ram, 
        sistemaoperativo, esservidor
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
	CREAR_PERMISOS: `INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) 
        VALUES 
        ($1, 'Ver servicios', 'Ver servicios asociados a la máquina', 'servicios'),
        ($2, 'Crear servicios', 'Permite la creación de servicios en esta máquina', 'servicios'),
        ($3, 'Eliminar servicios', 'Eliminar servicios asociados a la máquina', 'servicios'),
        ($4, 'Calendario', 'Permite al usuario la operación con el calendario', 'calendario')
        ;`,
	BASE_SELECT: `SELECT * FROM medal.maquina`,
	BUILD_GET_ALL: (conditions, limitIndex, offsetIndex) => {
		let query = `SELECT * FROM medal.maquina`;

		if (conditions.length > 0) {
			query += ` WHERE ` + conditions.join(" AND ");
		}

		query += ` ORDER BY idmaquina ASC`; // Recomendado añadir siempre un orden para paginación
		query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

		return query;
	},
	GET_MAQUINA_UUID: `SELECT * FROM medal.maquina WHERE uuidmaquina = $1;`,
	DELETE_PERMS: `DELETE FROM medal.permisos WHERE alias ILIKE $1`,
	DELETE_MAQ: `DELETE FROM medal.maquina WHERE uuidmaquina = $1`,
	VERIFICAR_EXISTE: `
        SELECT uuidmaquina FROM medal.maquina WHERE uuidmaquina = $1;
    `,

	GET_SERVICIOS_DETALLE: `
      SELECT 
          s.*, 
          p.uuidpeticion, 
          maq.uuidmaquina,
          puertos_agg.lista_puertos
      FROM medal.servicio s
      JOIN medal.peticion p ON s.idpeticion = p.idpeticion
      JOIN medal.corre c ON c.idservicio = s.idservicio
      JOIN medal.maquina maq ON maq.idmaquina = c.idmaquina
      JOIN (
          SELECT idservicio, 
                  json_agg(json_build_object(
                      'id', idpuerto, 
                      'puerto', numeropuertomaquina, 
                      'protocolo', protocolo,
                      'nombre', nombreservicio
                  )) AS lista_puertos
          FROM medal.puertosabiertos
          GROUP BY idservicio
      ) AS puertos_agg ON s.idservicio = puertos_agg.idservicio
      WHERE maq.uuidmaquina = $4
        AND s.nombreservicio ILIKE $3
      ORDER BY s.nombreservicio ASC 
      LIMIT $1 OFFSET $2;
  `,

	UPDATE_SERVER_DYNAMIC: (keys) => {
		const setClause = keys
			.map((key, index) => `${key} = $${index + 1}`)
			.join(", ");
		return `
          UPDATE medal.maquina 
          SET ${setClause} 
          WHERE uuidmaquina = $${keys.length + 1}
      `;
	},
};
