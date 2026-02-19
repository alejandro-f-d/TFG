import ServiciosModel from '../models/serviciosModel.js';
import {v4 as uuidv4} from 'uuid';

export const getServicios = async (req, res) => {
  try {
    const resServicios = await ServiciosModel.getAllInfoServicios();
    return res.status(200).json({message: "Listado de los servicios obtenido correctamente.", info: resServicios});
  } catch (error) {
    console.log("Error al hacer un get de los servicios.", error);
    return res.status(500).json({error: "Error interno del servidor"});
  } 
}
