import permisosModel from '../models/permisosModel.js'
export const getAllPermisos = async (req, res) => {
  try {
    const response = await permisosModel.getAllPermisos();
    return res.status(200).json({
      message: "Listado de permisos obtenido con éxito.",
      perms: response.rows
    });
  } catch (error) {
    console.error("Error al hacer get de todos los permisos. ", error);
    return res.status(500).json({error: "Error inesperado ha ocurrido."});
  }
}

 
