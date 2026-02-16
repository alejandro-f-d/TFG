import UserModel from '../models/userModel.js';
import {v4 as uuidv4} from 'uuid';


const verificarCorreo = (correo) => {
    if (!correo) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return regex.test(correo);
};

const obtenerDominio = (correo) => {
    if (!correo || !correo.includes('@')) {
        return null; 
    }
    const partes = correo.split('@');
    return partes[1];
};


export const postUser = async (req, res) => {
  try {
    const {
      nombre, apellido1, apellido2, roles, correoInstitucional,
      usuarioVpn, gitlab, puertasAutorizadas, profesorResponsable,
      fechaIncorporacion, fechaFin, wifi, activo, tarjetaAcceso,
      contrasena, dirIpLastLogin, teams, jefeLaboratorio, duenoMaquina, esResponsable
    } = req.body;

    if (!nombre || !apellido1 || !roles || !correoInstitucional || !fechaIncorporacion || activo === undefined) {
      return res.status(400).json({ error: `Faltan parámetros obligatorios.` });
    }

    if (!verificarCorreo(correoInstitucional)) {
      return res.status(400).json({ error: `El correo está mal formado.` });
    }

    let resultado;
    const dominio = obtenerDominio(correoInstitucional).toLowerCase();

    // console.log(dominio);
    if (dominio.includes("upm")) {
      resultado = await UserModel.postUserUpm(req.body);
    } else {
      if (!contrasena) {
        return res.status(400).json({ error: `La contraseña es obligatoria para usuarios externos.` });
      }
      resultado = await UserModel.postUser(req.body);
    }

    if (resultado.status === 'OK') {
      return res
        .status(201)
        .location(`${process.env.API_DIRECTION}/api/users/${resultado.id}`) 
        .json({
          message: "Usuario creado con éxito",
          id: resultado.id,
          url: `${process.env.API_DIRECTION}/users/${resultado.id}` 
        });
    } else {
      return res.status(500).json({ error: resultado.error });
    }

  } catch (error) {
    console.error("Error en postUser Controller:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

export const getUserByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;
    if(!uuid){
      return res.status(400).json({ error: `Falta el uuid.`});
    }
    const resultado = await UserModel.getUserByUuid(uuid);
    const usuario = resultado.info.rows[0];
    if(usuario == undefined){
      return res.status(404).json({
        message: "Usuario no encontrado."
      });
    }
    delete usuario.contrasena;
    return res.status(200).json({
      message: "Usuario encontrado con éxito.",
      info: usuario
    });

  } catch (error) {
    console.error("Error en el getUserByUuid", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  } 
} 

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const filtroNombre = req.query.filtroNombre || "";
    const resultado = await UserModel.getAllUsers(page, limit, filtroNombre);
    if (resultado.totalItems === 0) {
      return res.status(404).json({
        message: `No se han encontrado usuarios que coincidan con: ${filtroNombre}`
      });
    }
    const usuariosLimpios = resultado.rows.map(usuario => {
      const { contrasena, ...sinPass } = usuario;
      return sinPass;
    });
    return res.status(200).json({
      message: "Lista de usuarios devuelta correctamente.",
      info: usuariosLimpios,
      pagination: resultado.pagination
    });
  } catch (error) {
    console.error("Error en el getUsers", error);
    return res.status(500).json({error: "Error interno del servidor."});
  }
}

export const patchUser = async (req, res) => {
  try {
    const { uuid } = req.params;
    const camposCambiados = req.body;
    if (Object.keys(camposCambiados).length === 0) {
      return res.status(400).json({ error: "No se han enviado campos a actualizar." });
    }
    const resultado = await UserModel.patchUser(uuid, camposCambiados);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    return res.status(204).json({
      message: "Usuario actualizado."
    });
  } catch (error) {
    console.error("Error en el patchUser", error);
    return res.status(500).json({error: "Error en el servidor."});
  }
}


