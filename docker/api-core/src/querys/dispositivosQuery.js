export const DISPOSITIVOS_QUERY = {
	POST_QUERY: `INSERT INTO medal.dispositivos(nombre, puntomontaje, capacidad, capacidadusada, tecnologia, uuiddispositivo, idmaquina, idtipodispositivo) VALUES($1, $2, $3, $4, $5, $6, $7, $8);`,
};
