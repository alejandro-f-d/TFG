export const GITLAB_QUERYS = {
	// PROYECTOS
	GET_PROYECTO_BY_ID_GITLAB: `
    SELECT idProyecto, idGrupoGitlab 
    FROM medal.proyectosGitlab 
    WHERE idGitlab = $1
  `,

	ALTA_PROYECTO: `
    INSERT INTO medal.proyectosGitlab 
    (nombre, descripcion, uuidProyecto, fechaInicio, idGitlab, activo, idGrupoGitlab)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING idProyecto
  `,

	UPDATE_PROYECTO_GRUPO: `
    UPDATE medal.proyectosGitlab 
    SET idGrupoGitlab = $1 
    WHERE idProyecto = $2
  `,

	UPDATE_PROYECTO_ACTIVO: `
    UPDATE medal.proyectosGitlab 
    SET activo = $1 
    WHERE idProyecto = $2
  `,

	GET_ALL_PROYECTOS: `
    SELECT idProyecto, idGitlab 
    FROM medal.proyectosGitlab
  `,

	// USUARIOS
	GET_ID_USUARIO_BY_GITLAB_ID: `
    SELECT idUsuario FROM medal.usuario WHERE gitlab = $1
  `,

	GET_ALL_USUARIOS_ACTIVOS: `
    SELECT idUsuario, gitlab 
    FROM medal.usuario 
    WHERE activo = true AND gitlab IS NOT NULL
  `,

	// PARTICIPA
	GET_MIEMBROS_BY_PROYECTO: `
    SELECT p.idUsuario
    FROM medal.participa p
    WHERE p.idProyecto = $1
  `,

	ALTA_PARTICIPA: `
    INSERT INTO medal.participa (idUsuario, idProyecto, rol)
    VALUES ($1, $2, $3)
    ON CONFLICT (idUsuario, idProyecto) DO UPDATE 
    SET rol = EXCLUDED.rol
  `,

	DELETE_PARTICIPA: `
    DELETE FROM medal.participa 
    WHERE idUsuario = $1 AND idProyecto = $2
  `,
};
