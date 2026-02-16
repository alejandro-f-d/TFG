import pool from '../bbdd/conexion.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

class UserModel {
  
  static async guardarBdd(datos, userId) {
    // --- 1. ROLES ---
    if (Array.isArray(datos.roles)) {
      const queryRoles = `INSERT INTO medal.rolestiene(idrole, idusuario) values($1, $2);`;
      for (const rolId of datos.roles) {
        try {
          await pool.query(queryRoles, [rolId, userId]);
        } catch (error) {
          console.error("Error en la inserción del role: " + rolId, error.message);
        }
      }
    }

    // --- 2. PUERTAS ---
    if (Array.isArray(datos.puertasAutorizadas)) {
      const queryPuertas = `INSERT INTO medal.accede(idusuario, idpuerta) values($1, $2);`;
      for (const puertaId of datos.puertasAutorizadas) {
        try {
          await pool.query(queryPuertas, [userId, puertaId]);
        } catch (error) {
          console.error("Error en la inserción de la puerta: " + puertaId, error.message);
        }
      }
    }

    // --- 3. MAQUINAS ---
    if (Array.isArray(datos.duenoMaquina)) {
      const queryPropietario = `INSERT INTO medal.propietario(idusuario, idmaquina) values($1, $2);`;
      for (const maquinaId of datos.duenoMaquina) {
        try {
          await pool.query(queryPropietario, [userId, maquinaId]);
        } catch (error) {
          console.error("Error en la inserción de duenoMaquina: " + maquinaId, error.message);
        }
      }
    }
  }

  static async postUserUpm(datos) {
    const uuid = uuidv4();
    const queryUser = `INSERT INTO medal.usuario(nombre, apellido1, apellido2, teams, esresponsable, usuariovpn, correoinstitucional, activo, fechaincorporacion, fechafin, wifi, tarjetaacceso, uuidusuario, gitlab, responsable, jefelaboratorio) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING uuidusuario, idusuario;`;

    const valoresQuery1 = [
      datos.nombre, datos.apellido1, datos.apellido2 || null, datos.teams || false,
      datos.esResponsable || false, datos.usuarioVpn || null, datos.correoInstitucional,
      datos.activo, datos.fechaIncorporacion, datos.fechaFin || null, datos.wifi || false,
      datos.tarjetaAcceso || null, uuid, datos.gitlab || null,
      datos.profesorResponsable || null, datos.jefeLaboratorio || false
    ];

    try {
      const resCreateUser = await pool.query(queryUser, valoresQuery1);
      const userId = resCreateUser.rows[0].idusuario;
      const userUuid = resCreateUser.rows[0].uuidusuario;

      await this.guardarBdd(datos, userId);
      
      return { status: 'OK', id: userUuid };
    } catch (error) {
      console.error("Error en DB postUserUpm:", error);
      return { status: 'ERR', error: error.message };
    }
  }

  static async postUser(datos) {
    const uuid = uuidv4();
    const saltRounds = 10;
    const passwordHaseada = await bcrypt.hash(datos.contrasena, saltRounds);
    const queryUser = `INSERT INTO medal.usuario(nombre, apellido1, apellido2, teams, esresponsable, usuariovpn, correoinstitucional, activo, fechaincorporacion, fechafin, wifi, tarjetaacceso, uuidusuario, gitlab, responsable, jefelaboratorio, contrasena) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING uuidusuario, idusuario;`;

    const valoresQuery1 = [
      datos.nombre, datos.apellido1, datos.apellido2 || null, datos.teams || false,
      datos.esResponsable || false, datos.usuarioVpn || null, datos.correoInstitucional,
      datos.activo, datos.fechaIncorporacion, datos.fechaFin || null, datos.wifi || false,
      datos.tarjetaAcceso || null, uuid, datos.gitlab || null,
      datos.profesorResponsable || null, datos.jefeLaboratorio || false,
      passwordHaseada
    ];

    try {
      const resCreateUser = await pool.query(queryUser, valoresQuery1);
      const userId = resCreateUser.rows[0].idusuario;
      const userUuid = resCreateUser.rows[0].uuidusuario;

      await this.guardarBdd(datos, userId);
      return { status: 'OK', id: userUuid };
    } catch (error) {
      console.error("Error en DB postUser (Externo):", error);
      return { status: 'ERR', error: error.message };
    }
  }

  static async getUserByUuid(uuid){
    const queryGetUserByUuid = `SELECT * FROM medal.usuario WHERE uuidusuario = $1;`;
    try {
      const values = [uuid];
      const resGetUserByUuid = await pool.query(queryGetUserByUuid, values);
      return { status: 'OK', info: resGetUserByUuid };
    } catch (error) {
      console.error("Error al hacer un get de usuario por uuid: ", error);
      return { status: 'ERR', error: error.message };
    }

  }

  static async getAllUsers(page, limit){
    const offset = (page - 1) * limit;
    const queryGetAllUsers = `
      SELECT * FROM medal.usuario 
      ORDER BY idusuario ASC 
      LIMIT $1 OFFSET $2;
    `;
    try {
      const resGetAllUsers = await pool.query(queryGetAllUsers, [limit, offset]);
      return { status: 'OK', info: resGetAllUsers};
    } catch (error) {
      return {status: 'ERR', error: error.message};
    }
  }
}

export default UserModel;
