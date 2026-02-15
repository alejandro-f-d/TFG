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
      nombre, apellido1, apellido2, rol, correoInstitucional,
      usuarioVpn, gitlab, puertasAutorizadas, profesorResponsable,
      fechaIncorporacion, fechaFin, wifi, activo, tarjetaAcceso,
      contrasena, dirIpLastLogin, teams, jefeLaboratorio, duenoMaquina, esResponsable
    } = req.body;

    if (!nombre || !apellido1 || !rol || !correoInstitucional || !fechaIncorporacion || activo === undefined) {
      return res.status(400).json({ error: `Faltan parámetros obligatorios.` });
    }

    if (!verificarCorreo(correoInstitucional)) {
      return res.status(400).json({ error: `El correo está mal formado.` });
    }

    let resultado;
    const dominio = obtenerDominio(correoInstitucional).toLowerCase();

    if (dominio.includes("upm")) {
      // Llamada pasando el objeto completo (más limpio)
      resultado = await UserModel.postUserUpm(req.body);
    } else {
      if (!contrasena) {
        return res.status(400).json({ error: `La contraseña es obligatoria para usuarios externos.` });
      }
      resultado = await UserModel.postUser(req.body);
    }

    if (resultado.status === 'OK') {
      return res.status(201).json({
        message: "Usuario creado con éxito",
        id: resultado.id 
      });
    } else {
      return res.status(500).json({ error: resultado.error });
    }

  } catch (error) {
    console.error("Error en postUser Controller:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
