import pool from '../bbdd/conexion.js';
import { v4 as uuidv4 } from 'uuid';
class ServerModel {

  static async postMaquina(datos){
    const uuidMaquina = uuidv4();
    const queryServerPost = `INSERT INTO medal.maquina(uuidMaquina, nombre, caducidadssl, certificadosslactivo, emisorssl, direccionipprivadav4, direccionippublicav4, direccionipprivadav6, direccionippublicav6, puertaenlacev4,puertaenlacev6, ram, sistemaoperativo, esservidor) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;
    // El tipo de date  de postgresql es YYYY-MM-DD
    // console.log(datos.especificaciones.esServidor);
    const valuesPostServer = [
      uuidMaquina,
      datos.nombre,
      datos.caducidadSsl,
      datos.certificadoSslActivo,
      datos.emisorSsl,
      datos.red.direccionIpPrivadaV4,
      datos.red.direccionIpPublicaV4,
      datos.red.direccionIpPrivadaV6,
      datos.red.direccionIpPublicaV6,
      datos.red.puertaEnlaceV4,
      datos.red.puertaEnlaceV6,
      datos.especificaciones.ram,
      datos.especificaciones.sistemaOperativo,
      datos.especificaciones.esServidor
    ]

    try {
      await pool.query(queryServerPost, valuesPostServer); 
    } catch (error) {
      throw error;
    }
    return { status: 'OK', uuid: uuidMaquina };
  }

}
export default ServerModel;



