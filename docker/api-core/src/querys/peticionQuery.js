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
        INSERT INTO medal.peticion(uuidpeticion, estado, usuariopeticion, usuariosupervisor) 
        VALUES($1, 'PENDIENTE', $2, $3) 
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
};
