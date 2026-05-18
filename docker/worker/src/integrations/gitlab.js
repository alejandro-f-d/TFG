import axios from "axios";

// Funciones auxiliares internas
async function fetchAllPages(endpoint, extraParams = {}) {
	let allData = [];
	let page = 1;
	let hasMorePages = true;
	while (hasMorePages) {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4${endpoint}`,
			{
				headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
				params: { per_page: 100, page, ...extraParams },
			},
		);
		allData = allData.concat(response.data);
		const nextPage = response.headers["x-next-page"];
		if (nextPage) page = parseInt(nextPage, 10);
		else hasMorePages = false;
	}
	return allData;
}

async function fetchOnce(endpoint) {
	const response = await axios.get(
		`${process.env.URI_GITLAB}/api/v4${endpoint}`,
		{
			headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
		},
	);
	return response.data;
}

// Exportadas públicamente
export async function obtenerTodosLosProyectosUser(idUser) {
	let todosLosProyectos = [];
	let paginaActual = 1;
	let tieneMasPaginas = true;

	try {
		while (tieneMasPaginas) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/users/${idUser}/projects`,
				{
					headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
					params: { per_page: 100, page: paginaActual, archived: false },
				},
			);
			todosLosProyectos = todosLosProyectos.concat(response.data);
			const siguientePagina = response.headers["x-next-page"];
			if (siguientePagina) paginaActual = parseInt(siguientePagina, 10);
			else tieneMasPaginas = false;
		}
		return todosLosProyectos;
	} catch (error) {
		console.error("Error al obtener proyectos del usuario:", error);
		throw error;
	}
}

export async function getAllProjectMembers(projectId) {
	return fetchAllPages(`/projects/${projectId}/members/all`);
}

export async function getAllGroupProjects(groupId) {
	// Incluye subgrupos y proyectos archivados = false
	return fetchAllPages(`/groups/${groupId}/projects`, {
		include_subgroups: true,
		archived: false,
	});
}

export async function getUserGroups(userId) {
	// Obtiene grupos a los que pertenece el usuario
	const groups = await fetchAllPages(`/users/${userId}/groups`);
	return groups.map((g) => g.id);
}

// Otras funciones útiles (opcionales)
export async function getProjectInfo(projectId) {
	return fetchOnce(`/projects/${projectId}`);
}

export async function getGroupInfo(groupId) {
	return fetchOnce(`/groups/${groupId}`);
}

export async function getUserInfo(userId) {
	return fetchOnce(`/users/${userId}`);
}

export function mapAccessLevelToRole(accessLevel) {
	const roles = {
		0: "No Access",
		5: "Minimal Access",
		10: "Guest",
		20: "Reporter",
		30: "Developer",
		40: "Maintainer",
		50: "Owner",
	};
	return roles[accessLevel] || "Unknown";
}

// Si necesitas otras como obtenerTodosLosProyectos, etc., puedes añadirlas
