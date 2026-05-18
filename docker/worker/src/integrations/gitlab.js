import axios from "axios";

// Función auxiliar interna para gestionar la paginación de GitLab
async function fetchAllPages(endpoint, extraParams = {}) {
	let allData = [];
	let page = 1;
	let hasMorePages = true;
	while (hasMorePages) {
		try {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4${endpoint}`,
				{
					headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
					params: { per_page: 100, page, ...extraParams },
				},
			);
			if (!response.data || !Array.isArray(response.data)) break;

			allData = allData.concat(response.data);
			const nextPage = response.headers["x-next-page"];
			if (nextPage) page = parseInt(nextPage, 10);
			else hasMorePages = false;
		} catch (error) {
			console.error(
				`[GitLab API Error] en endpoint ${endpoint}:`,
				error.message,
			);
			break;
		}
	}
	return allData;
}

export async function getUserGroups() {
	return fetchAllPages("/groups");
}

export async function getGroupMembers(groupId) {
	return fetchAllPages(`/groups/${groupId}/members/all`);
}

export async function getAllGroupProjects(groupId) {
	return fetchAllPages(`/groups/${groupId}/projects`, {
		include_subgroups: true,
		archived: false,
	});
}

export async function getAllProjectMembers(projectId) {
	return fetchAllPages(`/projects/${projectId}/members/all`);
}

export async function obtenerTodosLosProyectosUser(idUser) {
	return fetchAllPages(`/users/${idUser}/projects`, { archived: false });
}
