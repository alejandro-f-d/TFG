import {v4 as uuidv4} from 'uuid';
import ServerModel from '../models/serverModel.js'

export const postMaquina = async (req, res) => {
  
  const {
    nombre, 
    propietarios,
    red,  
    especificaciones
  } = req.body;

  if(!nombre || !red || !especificaciones || !red.direccionIpPrivadaV4 || !red.puertaEnlaceV4 || !especificaciones.sistemaOperativo){
    return res.status(400).json({error: `Faltan parámetros obligatorios ${nombre}, ${red}, ${especificaciones}, ${red.direccionIpPrivadaV4}, ${red.puertaEnlaceV4}`});
  }
  try {
    const resBbdd = await ServerModel.postMaquina(req.body);
    if(resBbdd.status == 'OK'){
      return res.status(201).location(`/api/maquina/${resBbdd.uuid}`).json({
        message: "Máquina creada con éxito.",
        uuid: resBbdd.uuid,
        url: `${process.env.API_DIRECTION}/api/maquina/${resBbdd.uuid}` 
      });
    }
  } catch (error) {
    console.error("Error al hacer post del servidor.", error);
    return res.status(500).json({error: "Error interno del servidor."});
  }
  
}
