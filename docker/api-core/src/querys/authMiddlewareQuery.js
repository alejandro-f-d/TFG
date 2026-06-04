export const AUTH_MIDDLEWARE_QUERY = {
	GET_PERMS: `SELECT p.alias, u.idusuario
			FROM medal.usuario u
			INNER JOIN medal.rolesTiene rt ON rt.idUsuario = u.idUsuario
			INNER JOIN medal.roles r ON r.idRole = rt.idRole
			INNER JOIN medal.operaCon oc ON oc.idRole = r.idRole
			INNER JOIN medal.permisos p ON p.idPermiso = oc.idPermiso
			WHERE u.uuidusuario = $1`,
};
