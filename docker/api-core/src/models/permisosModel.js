import pool from '../bbdd/conexion.js';

class PermisosModel {
  static async getAllPermisos(){
    const queryGetAllPerms = `SELECT * FROM medal.permisos;` 
    return await pool.query(queryGetAllPerms, []); 
  }
}
export default PermisosModel;

