export const PERMISOS_QUERY = {
	GET_ALL: `SELECT 
    p.idpermiso,
    p.modulo,
    p.nombre,
		p.descripcion,
    CASE 
        -- Si el alias tiene el formato 'maquina:accion:UUID'
        WHEN p.alias LIKE 'maquina:%:%' THEN 
            concat(
                split_part(p.alias, ':', 1), ':', 
                split_part(p.alias, ':', 2), ':', 
                COALESCE(m.nombre, split_part(p.alias, ':', 3))
            )
        ELSE p.alias 
    END AS alias
FROM medal.permisos p
LEFT JOIN medal.maquina m ON 
    (CASE 
        WHEN p.alias LIKE 'maquina:%:%' THEN split_part(p.alias, ':', 3)::uuid 
        ELSE NULL 
    END) = m.uuidmaquina
ORDER BY p.modulo, p.idpermiso;`,
	ADD_PARTICIPANTE: `INSERT INTO medal.participa(idusuario, idproyecto) VALUES($1, $2);`,
};
