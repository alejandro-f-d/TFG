// src/querys/gitlabQuerys.js

export const GITLAB_QUERYS = {
	// Obtiene los usuarios activos con ID de GitLab asignado
	GET_ALL_USUARIOS_ACTIVOS: `
		SELECT idUsuario, gitlab 
		FROM medal.usuario 
		WHERE activo = TRUE AND gitlab IS NOT NULL;
	`,

	// [SIN FILTROS] Trae la tabla completa para poder detectar y borrar los NULL
	GET_ALL_PROYECTOS: `
		SELECT idProyecto, idGitlab 
		FROM medal.proyectosGitlab;
	`,

	// Inserta o actualiza un proyecto mapeando el estado de archivado
	ALTA_PROYECTO: `
		INSERT INTO medal.proyectosGitlab (uuidProyecto, idGitlab, nombre, descripcion, activo)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (idGitlab) 
		DO UPDATE SET 
			nombre = EXCLUDED.nombre, 
			descripcion = COALESCE(EXCLUDED.descripcion, medal.proyectosGitlab.descripcion),
			activo = EXCLUDED.activo
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
};
