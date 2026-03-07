export const PETICION_QUERY = {
	OBTENER_DATOS_USUARIO: `
        SELECT 
            idusuario, 
            (nombre || ' ' || apellido1 || ' ' || COALESCE(apellido2, '')) AS nombre_completo, 
            correoinstitucional, 
            esresponsable,
            responsable
        FROM medal.usuario 
        WHERE uuidusuario = $1;`,

	OBTENER_DATOS_RESPONSABLE: `
        SELECT (nombre || ' ' || apellido1 || ' ' || COALESCE(apellido2, '')) AS nombre_completo 
        FROM medal.usuario 
        WHERE idusuario = $1;`,

	POST_TABLA_PETICION: `
        INSERT INTO medal.peticion(uuidpeticion, estado, usuariopeticion, usuariosupervisor, fechafin) 
        VALUES($1, 'PENDIENTE', $2, $3, $4) 
        RETURNING idpeticion;`,

	POST_DETALLE_PETICION: `
        INSERT INTO medal.detallepeticionacceso(
            idpeticionreferencia, cpusolicitada, gpusolicitada, nombreproyectoasociado, 
            nombreservicioasociado, prioridadtarea, docker, sistemaoperativo, 
            comentariosadicionales, tiempoestimadotarea, nombreaccesonativo, 
            disco, justificacionaccesonativo, ram, idmomentoejecucion
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,

	POST_MAQUINA: `
        INSERT INTO medal.alojado(idpetacceso, idmaquina) 
        VALUES($1, $2) RETURNING (SELECT nombre FROM medal.maquina WHERE idmaquina = $2) AS nombre_maquina;`,
	OBTENER_MOMENTO_EJECUCION: `SELECT nombre from medal.momentoejecucion WHERE idmomentoejecucion = $1`,
	OBTENER_PRIORIDAD_TAREA: `SELECT nombre FROM medal.prioridadtarea WHERE idprioridad = $1;`,
	DUENO_PETICION: `SELECT usuariopeticion FROM medal.peticion WHERE uuidpeticion = $1;`,
	GET_PROYECTO_BY_UUID: `
        SELECT 
            p.*, 
            pa.*, 
            t.nombre AS prioridad_nombre, 
            x.nombre AS momento_ejecucion_nombre,
            CONCAT(u_c.nombre, ' ', u_c.apellido1, ' ', COALESCE(u_c.apellido2, '')) AS nombre_creador,
            CONCAT(u_s.nombre, ' ', u_s.apellido1, ' ', COALESCE(u_s.apellido2, '')) AS nombre_supervisor
        FROM medal.peticion p
        INNER JOIN medal.detallepeticionacceso pa ON p.idpeticion = pa.idPeticionReferencia
        INNER JOIN medal.prioridadtarea t ON pa.prioridadtarea = t.idprioridad
        INNER JOIN medal.momentoejecucion x ON pa.idmomentoejecucion = x.idmomentoejecucion
        INNER JOIN medal.usuario u_c ON p.usuariopeticion = u_c.idusuario
        LEFT JOIN medal.usuario u_s ON u_c.responsable = u_s.idusuario
        WHERE p.uuidpeticion = $1;
    `,
	OBTENER_UUID_DOC: `SELECT p.uuiddocumento, d.nombreproyectoasociado FROM medal.peticion p, medal.detallepeticionacceso d WHERE p.idpeticion = d.idPeticionReferencia  AND uuidpeticion = $1;`,
	OBTENER_RESPONSABLE: `
        SELECT 
            u.responsable AS id_responsable_del_creador,
            p.usuariopeticion AS id_creador_peticion
        FROM medal.peticion p
        INNER JOIN medal.usuario u ON p.usuariopeticion = u.idusuario
        WHERE p.uuidpeticion = $1;
    `,
	OBTENER_PETICIONES_PAGINACION_ALL: `
        SELECT 
            p.*, 
            pa.*, 
            t.nombre AS prioridad_nombre, 
            x.nombre AS momento_ejecucion_nombre,
            CONCAT(u_c.nombre, ' ', u_c.apellido1, ' ', COALESCE(u_c.apellido2, '')) AS nombre_creador,
            CONCAT(u_s.nombre, ' ', u_s.apellido1, ' ', COALESCE(u_s.apellido2, '')) AS nombre_supervisor
        FROM medal.peticion p
        INNER JOIN medal.detallepeticionacceso pa ON p.idpeticion = pa.idPeticionReferencia
        INNER JOIN medal.prioridadtarea t ON pa.prioridadtarea = t.idprioridad
        INNER JOIN medal.momentoejecucion x ON pa.idmomentoejecucion = x.idmomentoejecucion
        INNER JOIN medal.usuario u_c ON p.usuariopeticion = u_c.idusuario
        LEFT JOIN medal.usuario u_s ON u_c.responsable = u_s.idusuario 
        WHERE pa.nombreproyectoasociado ILIKE $1 
        AND p.estado ILIKE $2 
        ORDER BY p.idpeticion ASC 
        LIMIT $3 OFFSET $4;
    `,
	COUNT_PETICIONES_ALL: `
        SELECT COUNT(DISTINCT p.idpeticion) 
        FROM medal.peticion p
        INNER JOIN medal.detallepeticionacceso pa ON p.idpeticion = pa.idPeticionReferencia
        INNER JOIN medal.usuario u_c ON p.usuariopeticion = u_c.idusuario
        WHERE pa.nombreproyectoasociado ILIKE $1 
        AND p.estado ILIKE $2;
    `,
};
