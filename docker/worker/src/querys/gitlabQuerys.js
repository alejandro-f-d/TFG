export const GITLAB_QUERYS = {
	ALTA_PROYECTO: `
        INSERT INTO medal.proyectosgitlab(nombre, descripcion, uuidproyecto, fechainicio, idgitlab, activo)
        VALUES($1, $2, $3, $4, $5, $6)
        ON CONFLICT (idgitlab) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            activo = EXCLUDED.activo
        RETURNING idproyecto;
    `,
	ALTA_USUARIOS: `
        INSERT INTO medal.participa(idusuario, idproyecto)
        VALUES($1, $2)
        ON CONFLICT DO NOTHING;
    `,
	GET_ID_USUARIO_BY_GITLAB_ID: `
        SELECT idusuario FROM medal.usuario WHERE gitlab = $1;
    `,
};
