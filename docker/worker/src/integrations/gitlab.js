import axios from "axios";
export async function obtenerTodosLosProyectosUser(idUser) {
	let todosLosProyectos = [];
	let paginaActual = 1;
	let tieneMasPaginas = true;

	try {
		while (tieneMasPaginas) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/users/${idUser}/projects`,
				{
					headers: {
						"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
					},
					params: {
						per_page: 100,
						page: paginaActual,
						archived: false,
					},
				},
			);

			const projects = response.data;
			todosLosProyectos = todosLosProyectos.concat(projects);

			const siguientePagina = response.headers["x-next-page"];

			if (siguientePagina) {
				paginaActual = parseInt(siguientePagina, 10);
			} else {
				tieneMasPaginas = false;
			}
		}

		return todosLosProyectos; // Array con estructura: [{project.name, project.id, project.http_url_to_repo}]
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener la totalidad de los proyectos de un usuario.",
			error,
		);
		throw error;
	}
}

export async function getAllProjectMembers(projectId) {
	let allMembers = [];
	let page = 1;
	const perPage = 100;
	let hasMorePages = true;

	try {
		while (hasMorePages) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/members/all`,
				{
					headers: {
						"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
					},
					params: {
						per_page: perPage,
						page: page,
					},
				},
			);

			const members = response.data;
			allMembers = allMembers.concat(members);

			const nextPage = response.headers["x-next-page"];
			if (nextPage) {
				page = parseInt(nextPage, 10);
			} else {
				hasMorePages = false;
			}
		}
		return allMembers; // Estructura dentro member.id, member.username, member.name, member.access_level
	} catch (error) {
		console.error(
			"Error al obtener la lista completa de miembros:",
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}
