import {
	obtenerTodosLosProyectosUser,
	getAllProjectMembers,
} from "../integrations/gitlab.js";
import GitlabModel from "../models/gitlabModel.js";
export const executeGitlab = async () => {
	try {
		const resProyectos = await obtenerTodosLosProyectosUser(1);
		console.log("Los proyectos son", resProyectos);
		for (const proyecto of resProyectos) {
			console.log(`Nombre del proyecto: ${proyecto.name}`);
			console.log(`Descripcion del proyecto: ${proyecto.description}`);
			console.log(`Fecha inicio: ${proyecto.created_at}`);
			console.log(`===MIEMBROS===`);
			let miembros = await getAllProjectMembers(proyecto.id);
			console.log(`Los miembros son:`, miembros);
			await GitlabModel.autoCreateProyect(
				proyecto.id,
				proyecto.name,
				proyecto.description,
				miembros,
				proyecto.created_at,
				proyecto.archived,
			);
		}
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener la información de gitlab.",
		);
		throw error;
	}
};
