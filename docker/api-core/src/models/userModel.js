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

  static async getAllUsers(page, limit, filtroNombre) {
      const offset = (page - 1) * limit;
      const busqueda = `%${filtroNombre}%`;
      const query = `
        SELECT * FROM medal.usuario 
        WHERE nombre ILIKE $3
        ORDER BY idusuario ASC 
        LIMIT $1 OFFSET $2;
      `; // Se usa ILIKE para que no sea caseSensitive.

      try {
          const res = await pool.query(query, [limit, offset, busqueda]); 
          const countQuery = `SELECT COUNT(*) FROM medal.usuario WHERE nombre ILIKE $1`;
          const countRes = await pool.query(countQuery, [busqueda]);
          const totalItems = parseInt(countRes.rows[0].count);
          return { 
              status: 'OK', 
              rows: res.rows,
              pagination: {
                  totalItems,
                  totalPages: Math.ceil(totalItems / limit),
                  currentPage: page,
                  totalItems: totalItems
              }
          };
      } catch (error) {
          throw error;
      }
  }

  static async patchUser(uuid, campos){
    try {      
      const keys = Object.keys(campos);
      const values = Object.values(campos); 
      const setQuery = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      values.push(uuid);
      const patchUser = `
          UPDATE medal.usuario 
          SET ${setQuery} 
          WHERE uuidusuario = $${values.length}
      `;
      return await pool.query(patchUser, values); 
    } catch (error) {
      console.error("Error al hacer el patch a un usuario.");
      throw error;
    }
  }

  static async darBaja(uuid){
    const queryDarBaja =`UPDATE medal.usuario SET activo = false WHERE uuidusuario = $1;`;
    try { 
      return await pool.query(queryDarBaja, [uuid]); 
    } catch (error) {
    throw error; 
    }
  }
  static async getPasswordByCorreoInstitucional(correoInstitucional){
    try {
      const queryGetPasswordByCorreoInstitucional = `SELECT 
     u.contrasena, 
     u.uuidusuario, 
     array_agg(perm.alias) AS permisos
      FROM 
          medal.usuario u, 
          medal.rolestiene r, medal.operacon p, medal.permisos perm 
      WHERE 
          u.idusuario = r.idusuario AND r.idrole = p.idrole and p.idpermiso = perm.idpermiso
          AND u.correoinstitucional = 'alejandro.fisac.contact@gmail.com' 
          AND u.activo = true
      GROUP BY 
     u.idusuario, u.contrasena, u.uuidusuario;`; // Si el usuario no es un usuario activo no puede entrar en la plataforma.
      const res = await pool.query(queryGetPasswordByCorreoInstitucional, [correoInstitucional]); 
      return res.rows[0];
    } catch (error) {
      throw error;
    }
  }
  static async intentoInicioSesion(ip, correoInstitucional, exitoso){
    const queryIntentoLogin = `INSERT INTO medal.intentosLogin(iporigen, emailintentado, exitoso) values($1, $2, $3);`;
    try {
      await pool.query(queryIntentoLogin, [ip, correoInstitucional, exitoso]);
      return {status: "Ok"};
    } catch (error) {
      throw error;
    }
  }
}

export default UserModel;
