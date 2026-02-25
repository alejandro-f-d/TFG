import pool from "../bbdd/conexion.js";

class RolModel {
  static async postRole(permisosUsuario, usuarioId, data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const uuidRole = uuidv4(); 
      const queryPostRole = `INSERT INTO medal.roles(nombre, descripcion, idusuario, uuidrole) VALUES($1, $2, $3, $4) RETURNING idrole;`;
      const resPostRole = await client.query(queryPostRole, [data.nombre, data.descripcion, usuarioId, uuidRole]);
      const idRole = resPostRole.rows[0].idrole;

      const resPermisosEspeciales = await client.query(
        "SELECT idpermiso, alias FROM medal.permisos WHERE alias IN ('null:null', 'admin:total');"
      );
      
      const permisoNull = resPermisosEspeciales.rows.find(p => p.alias === 'null:null');
      const permisoAdmin = resPermisosEspeciales.rows.find(p => p.alias === 'admin:total');

      if (!permisoNull || !permisoAdmin) {
          throw new Error("No se encontraron los permisos base en la base de datos.");
      }

      const permisosAAisgnar = Array.isArray(data.participantes) ? [...data.participantes] : [];
      
      if (!permisosAAisgnar.includes(permisoNull.idpermiso)) {
          permisosAAisgnar.push(permisoNull.idpermiso);
      }

      const soyAdmin = permisosUsuario.includes("admin:total");

      for (const idPermiso of permisosAAisgnar) {
        // SEGURIDAD: Si el permiso es admin:total, solo se inserta si el creador es admin
        if (idPermiso === permisoAdmin.idpermiso) {
          if (soyAdmin) {
            await client.query("INSERT INTO medal.operacon(idrole, idpermiso) VALUES ($1, $2)", [idRole, idPermiso]);
          } else {
            console.warn(`Usuario ${usuarioId} intentó asignar admin:total sin tener permisos.`);
            continue; 
          }
        } else {
          await client.query("INSERT INTO medal.operacon(idrole, idpermiso) VALUES ($1, $2)", [idRole, idPermiso]);
        }
      }

      await client.query("COMMIT");
      return { status: "OK", idRole, uuid: uuidRole};

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al crear el rol:", {
        nombre: data?.nombre,
        descripcion: data?.descripcion,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default RolModel;
