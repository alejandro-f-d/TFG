import {UserModel} from '../models/userModel.js';
import {v4 as uuidv4} from 'uuid';


export const postUser = async (res, req) => {
  // Generamos el UUID identificador del nuevo usuario. (Lógica del programa.) 
  // Extracción de parámetros obligatorios:
  const {
    nombre,
    apellido1,
    apellido2,
    rol,
    correoInstitucional,
    usuarioVpn,
    gitlab,
    puertas_autorizadas,
    profesorResponsable,
    fechaIncorporacion,
    fechaFin, 
    wifi,
    activo,
    tarjetaAcceso,
    contrasena,
    dirIpLastLogin,
    teams,
    jefeLaboratorio,
    duenoMaquina
  } = req.body;
  if(!nombre || !apellido1 || !rol || !correoInstitucional || !profesorResponsable || !fechaIncorporacion || !activo) {
    return res.status(400).json({error: `Faltan parámetros obligatorios.`})
  }
  // El checkeo de si es usuario no upm lo hará el frontend con un box selection que si no lo es habilitará la opción de contraseña como oblligatorio.

  const userCreado = await UserModel.postUser(nombre, apellido1, apellido2, rol, correoInstitucional, usuarioVpn, gitlab, puertas_autorizadas, profesorResponsable, fechaIncorporacion, fechaFin, wifi, activo, tarjetaAcceso, contrasena, dirIpLastLogin, teams, jefeLaboratorio, duenoMaquina); 

} 
