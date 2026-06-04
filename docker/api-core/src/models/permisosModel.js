import pool from "../bbdd/conexion.js";
import { PERMISOS_QUERY } from "../querys/permisosQuery.js";

class PermisosModel {
	static async getAllPermisos() {
		return await pool.query(PERMISOS_QUERY.GET_ALL, []);
	}
}
export default PermisosModel;
