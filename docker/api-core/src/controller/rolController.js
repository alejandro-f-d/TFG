import { v4 as uuidv4 } from "uuid";
import RolModel from "../models/rolModel.js"

export const postRole = async (req, res) => {
  
  const { nombre, descripcion, permisos } = req.body;

  if(!nombre || !permisos) {
    return res.status(400).json({error: "Petición mal formada"});
  }

  try {
    const resPostRole = await RolModel.postRole(req.user?.permisos, req.user?.id, req.body);  
    // TODO: Terminar el método de post con el location
  } catch (error) {
    console.error("Se ha producido un error al hacer post de un role.", req, error);
    return res.status(500).json({error: "Error interno del servidor."});
  }
} 
