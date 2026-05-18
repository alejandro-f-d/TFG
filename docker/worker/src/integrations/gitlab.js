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

		return todosLosProyectos;
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener la totalidad de los proyectos de un usuario.",
			error,
		);
		throw error;
	}
}

export async function obtenerTodosLosProyectos() {
	let todosLosProyectos = [];
	let paginaActual = 1;
	let tieneMasPaginas = true;

	try {
		while (tieneMasPaginas) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/projects`,
				{
					headers: {
						"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
					},
					params: {
						per_page: 100,
						page: paginaActual,
						archived: false,
						membership: false,
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

		return todosLosProyectos;
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener todos los proyectos:",
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
		return allMembers;
	} catch (error) {
		console.error(
			"Error al obtener la lista completa de miembros:",
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getDirectProjectMembers(projectId) {
	let allMembers = [];
	let page = 1;
	const perPage = 100;
	let hasMorePages = true;

	try {
		while (hasMorePages) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/members`,
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
		return allMembers;
	} catch (error) {
		console.error(
			"Error al obtener miembros directos del proyecto:",
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getAllGroupMembers(groupId) {
	let allMembers = [];
	let page = 1;
	const perPage = 100;
	let hasMorePages = true;

	try {
		while (hasMorePages) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/groups/${groupId}/members`,
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
		return allMembers;
	} catch (error) {
		console.error(
			`Error al obtener miembros del grupo ${groupId}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getUserInfo(userId) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/users/${userId}`,
			{
				headers: {
					"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
				},
			},
		);
		return response.data;
	} catch (error) {
		console.error(
			`Error al obtener información del usuario ${userId}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getUserByUsername(username) {
	try {
		const response = await axios.get(`${process.env.URI_GITLAB}/api/v4/users`, {
			headers: {
				"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
			},
			params: {
				username: username,
			},
		});
		return response.data.length > 0 ? response.data[0] : null;
	} catch (error) {
		console.error(
			`Error al buscar usuario ${username}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getProjectInfo(projectId) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}`,
			{
				headers: {
					"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
				},
			},
		);
		return response.data;
	} catch (error) {
		console.error(
			`Error al obtener información del proyecto ${projectId}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getGroupInfo(groupId) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/groups/${groupId}`,
			{
				headers: {
					"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
				},
			},
		);
		return response.data;
	} catch (error) {
		console.error(
			`Error al obtener información del grupo ${groupId}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
}

export async function getGroupProjects(groupId) {
	let allProjects = [];
	let page = 1;
	const perPage = 100;
	let hasMorePages = true;

	try {
		while (hasMorePages) {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4/groups/${groupId}/projects`,
				{
					headers: {
						"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
					},
					params: {
						per_page: perPage,
						page: page,
						archived: false,
					},
				},
			);

			const projects = response.data;
			allProjects = allProjects.concat(projects);

			const nextPage = response.headers["x-next-page"];
			if (nextPage) {
				page = parseInt(nextPage, 10);
			} else {
				hasMorePages = false;
			}
		}
		return allProjects;
	} catch (error) {
		console.error(
			`Error al obtener proyectos del grupo ${groupId}:`,
			error.response ? error.response.data : error.message,
		);
		throw error;
	}
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

export async function getUserMemberships(userId) {
	return fetchAllPages(`/users/${userId}/memberships`);
}

export async function getAllGroupProjects(groupId) {
	return fetchAllPages(`/groups/${groupId}/projects`, {
		include_subgroups: true,
	});
}

export async function getAllProjectById(projectId) {
	return fetchOnce(`/projects/${projectId}`);
}
