export const MONITOR_QUERY = {
	CREAR_MONITOR: `INSERT INTO medal.monitoreoweb(nombreobjetivo, direccion, valoresperado, uuidmonitoreo, timeoutsegundos, umbralreintentos, idusuario, idmetodo, cadacuantosegundos) values($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
};
