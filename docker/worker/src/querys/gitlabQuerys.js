// src/querys/gitlabQuerys.js

export const GITLAB_QUERYS = {
	// Obtiene los usuarios activos que poseen un ID numérico de GitLab vinculado
	GET_ALL_USUARIOS_ACTIVOS: `
		SELECT idUsuario, gitlab 
		FROM medal.usuario 
		WHERE activo = TRUE AND gitlab IS NOT NULL;
	`,

	// Obtiene todos los proyectos que ya tenemos registrados localmente
	GET_ALL_PROYECTOS: `
		SELECT idProyecto, idGitlab 
		FROM medal.proyectosGitlab 
		WHERE idGitlab IS NOT NULL;
	`,

	// [NUEVA/CORREGIDA] Inserta o actualiza un proyecto con sus datos enriquecidos reales
	ALTA_PROYECTO: `
		INSERT INTO medal.proyectosGitlab (uuidProyecto, nombre, descripcion, idGitlab)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (idGitlab) 
		DO UPDATE SET 
			nombre = EXCLUDED.nombre, 
			descripcion = COALESCE(EXCLUDED.descripcion, medal.proyectosGitlab.descripcion)
		RETURNING idProyecto;
	`,

	// [SOPORTE COMPATIBILIDAD] Por si acaso se llama con parámetros básicos en registros automáticos
	ALTA_PROYECTO_MINIMAL: `
		INSERT INTO medal.proyectosGitlab (uuidProyecto, idGitlab, nombre, descripcion)
		VALUES ($1, $2, 'Proyecto GitLab ' || $2, NULL)
		ON CONFLICT (idGitlab) DO UPDATE SET idGitlab = EXCLUDED.idGitlab
		RETURNING idProyecto;
	`,

	// Elimina físicamente el proyecto local cuando ya no existe en el servidor GitLab (Paso 3 de Purga)
	DELETE_PROYECTO: `
		DELETE FROM medal.proyectosGitlab 
		WHERE idProyecto = $1;
	`,

	// Devuelve el Set de IDs de usuarios asociados actualmente a un proyecto en nuestra BD
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

	// Remueve a un usuario del proyecto local si ya no forma parte de él en GitLab
	DELETE_PARTICIPA: `
		DELETE FROM medal.participa 
		WHERE idUsuario = $1 AND idProyecto = $2;
	`,
};
