export const GITLAB_QUERYS = {
	// Obtiene los usuarios activos con ID de GitLab asignado
	GET_ALL_USUARIOS_ACTIVOS: `
        SELECT idUsuario, gitlab 
        FROM medal.usuario 
        WHERE activo = TRUE AND gitlab IS NOT NULL;
    `,

	GET_ALL_PROYECTOS: `
        SELECT idProyecto, idGitlab, idGrupoGitlab 
        FROM medal.proyectosGitlab;
    `,

	// Inserta o actualiza un proyecto mapeando el estado de archivado y su pertenencia a un grupo
	ALTA_PROYECTO: `
        INSERT INTO medal.proyectosGitlab (uuidProyecto, idGitlab, nombre, descripcion, activo, idGrupoGitlab)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (idGitlab) 
        DO UPDATE SET 
            nombre = EXCLUDED.nombre, 
            descripcion = COALESCE(EXCLUDED.descripcion, medal.proyectosGitlab.descripcion),
            activo = EXCLUDED.activo,
            idGrupoGitlab = EXCLUDED.idGrupoGitlab
        RETURNING idProyecto;
    `,

	// Remueve todos los participantes vinculados a un proyecto antes de eliminarlo (Seguridad FK)
	DELETE_ALL_PARTICIPANTES_PROYECTO: `
        DELETE FROM medal.participa
        WHERE idProyecto = $1;
    `,

	// Elimina físicamente el proyecto de la tabla proyectosGitlab
	DELETE_PROYECTO: `
        DELETE FROM medal.proyectosGitlab 
        WHERE idProyecto = $1;
    `,

	// Devuelve los IDs de usuarios asociados actualmente a un proyecto en nuestra BD
	GET_MIEMBROS_BY_PROYECTO: `
        SELECT idUsuario 
        FROM medal.participa 
        WHERE idProyecto = $1;
    `,

	// Agrega o actualiza los permisos de membresía de un desarrollador
	ALTA_PARTICIPA: `
        INSERT INTO medal.participa (idUsuario, idProyecto, rol)
        VALUES ($1, $2, $3)
        ON CONFLICT (idUsuario, idProyecto) 
        DO UPDATE SET rol = EXCLUDED.rol;
    `,

	// Remueve a un usuario específico del proyecto local
	DELETE_PARTICIPA: `
        DELETE FROM medal.participa 
        WHERE idUsuario = $1 AND idProyecto = $2;
    `,

	// --- QUERYS PARA GRUPOS DE GITLAB ---

	// Obtiene el mapa relacional de los grupos locales
	GET_ALL_GRUPOS_LOCALES: `
        SELECT idGrupo, idGitlab FROM medal.gruposGitlab;
    `,

	// Inserta o actualiza un grupo de GitLab basándose en su ID externo real
	ALTA_GRUPO_GITLAB: `
        INSERT INTO medal.gruposGitlab (nombre, descripcion, path, webURL, idGitlab)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (idGitlab) 
        DO UPDATE SET 
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            path = EXCLUDED.path,
            webURL = EXCLUDED.webURL
        RETURNING idGrupo;
    `,

	// Elimina físicamente un grupo local por su ID secuencial interno
	DELETE_GRUPO_GITLAB: `
        DELETE FROM medal.gruposGitlab WHERE idGrupo = $1;
    `,

	// Devuelve los IDs de los usuarios que pertenecen a un grupo local
	GET_MIEMBROS_BY_GRUPO: `
        SELECT idUsuario FROM medal.pertenecegrupogitlab WHERE idGrupo = $1;
    `,

	// Vincula a un usuario con un grupo si la relación no existe previamente
	ALTA_PERTENECE_GRUPO: `
        INSERT INTO medal.pertenecegrupogitlab (idUsuario, idGrupo)
        VALUES ($1, $2)
        ON CONFLICT (idUsuario, idGrupo) DO NOTHING;
    `,

	// Rompe la relación de un usuario con un grupo de GitLab específico
	DELETE_PERTENECE_GRUPO: `
        DELETE FROM medal.pertenecegrupogitlab WHERE idUsuario = $1 AND idGrupo = $2;
    `,
};
