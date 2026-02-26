export const PERMISOS_QUERY = {
  GET_ALL:`SELECT * FROM medal.permisos;`,
  ADD_PARTICIPANTE: `INSERT INTO medal.participa(idusuario, idproyecto) VALUES($1, $2);`
}
