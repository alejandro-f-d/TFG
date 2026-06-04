import axios from "axios";

/**
 * Helper genérico para recorrer todas las páginas de la API de GitLab.
 * Aplica de forma estricta las cabeceras de autenticación y Modo Administrador.
 */
async function fetchAllPages(endpoint, extraParams = {}) {
	let allData = [];
	let page = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		try {
			const response = await axios.get(
				`${process.env.URI_GITLAB}/api/v4${endpoint}`,
				{
					headers: {
						"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
						"X-GitLab-Admin-Mode": "true", // Fuerza superpoderes de Admin en toda la instancia
					},
					params: { per_page: 100, page, ...extraParams },
				},
			);

			if (!response.data || !Array.isArray(response.data)) break;

			allData = allData.concat(response.data);
			const nextPage = response.headers["x-next-page"];

			if (nextPage) {
				page = parseInt(nextPage, 10);
			} else {
				hasMorePages = false;
			}
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

/**
 * [PASO 1] Obtiene los grupos globales visibles por el Token raíz.
 */
export async function getUserGroups() {
	return fetchAllPages("/groups");
}

/**
 * Obtiene los miembros pertenecientes a un grupo específico.
 */
export async function getGroupMembers(groupId) {
	return fetchAllPages(`/groups/${groupId}/members`);
}

/**
 * Obtiene todos los proyectos que residen dentro de un grupo.
 */
export async function getAllGroupProjects(groupId) {
	return fetchAllPages(`/groups/${groupId}/projects`);
}

/**
 * Obtiene los miembros explícitos asignados a un proyecto concreto.
 */
export async function getAllProjectMembers(projectId) {
	return fetchAllPages(`/projects/${projectId}/members`);
}

/**
 * [PASO 2] Obtiene TODOS los proyectos de un usuario por su ID de GitLab.
 * Al no enviar parámetros restrictivos de archivado, indexa repositorios como el de Jesús Miguel.
 */
export async function obtenerTodosLosProyectosUser(idUser) {
	return fetchAllPages(`/users/${idUser}/projects`);
}

/**
 * [PASO 3] Verifica la existencia unitaria de un proyecto (Evita falsos 404 en purgas).
 */
export async function checkProjectExists(projectId) {
	try {
		await axios.get(`${process.env.URI_GITLAB}/api/v4/projects/${projectId}`, {
			headers: {
				"PRIVATE-TOKEN": process.env.GITLAB_TOKEN,
				"X-GitLab-Admin-Mode": "true",
			},
		});
		return true;
	} catch (error) {
		return false;
	}
}

export async function obtenerGruposYMiembros() {
	try {
		const responseGrupos = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/groups`,
			{
				headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
				params: {
					per_page: 100,
				},
			},
		);

		const grupos = responseGrupos.data;
		const resultadoCompleto = [];

		for (const grupo of grupos) {
			try {
				const responseMiembros = await axios.get(
					`${process.env.URI_GITLAB}/api/v4/groups/${grupo.id}/members`,
					{
						headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN },
					},
				);

				const miembrosLimpios = responseMiembros.data.map((miembro) => ({
					idUsuario: miembro.id,
					username: miembro.username,
					nombre: miembro.name,
					estado: miembro.state,
					nivelAcceso: miembro.access_level,
				}));

				resultadoCompleto.push({
					id: grupo.id,
					nombre: grupo.name,
					descripcion: grupo.description || "Sin descripción",
					path: grupo.path,
					webUrl: grupo.web_url,
					miembros: miembrosLimpios,
				});
			} catch (errorMiembros) {
				console.error(
					`[GitLab API Error] No se pudieron obtener los miembros del grupo ${grupo.name}:`,
					errorMiembros.message,
				);
				resultadoCompleto.push({
					id: grupo.id,
					nombre: grupo.name,
					descripcion: grupo.description || "Sin descripción",
					path: grupo.path,
					webUrl: grupo.web_url,
					miembros: [],
				});
			}
		}

		return resultadoCompleto;
	} catch (error) {
		console.error(
			"[GitLab API Error] Error crítico al listar los grupos:",
			error.message,
		);
		return [];
	}
}
