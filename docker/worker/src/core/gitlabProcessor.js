import {
	obtenerTodosLosProyectosUser,
	getAllProjectMembers,
} from "../integrations/gitlab.js";
export const executeGitlab = async () => {
	try {
		const resProyectos = await obtenerTodosLosProyectosUser(1);
		console.log("Los proyectos son", resProyectos);
		resProyectos.forEach((proyecto) => {
			console.log(`Nombre del proyecto: ${proyecto.name}`);
			console.log(`Descripcion del proyecto: ${proyecto.description}`);
			console.log(`Fecha inicio: ${proyecto.created_at}`);
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener la información de gitlab.",
		);
		throw error;
	}
};
