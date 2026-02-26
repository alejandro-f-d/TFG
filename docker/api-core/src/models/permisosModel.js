import pool from '../bbdd/conexion.js';
import { PERMISOS_QUERY } from '../querys/permisosQuery.js'

class PermisosModel {
  static async getAllPermisos(){
    const queryGetAllPerms = `SELECT * FROM medal.permisos;` 
    return await pool.query(PERMISOS_QUERY.GET_ALL, []); 
  }
}
export default PermisosModel;

