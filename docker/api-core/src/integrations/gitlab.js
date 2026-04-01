import axios from "axios";
async function obtenerIdPorUsername(username) {
	try {
		const response = await axios.get(`${process.env.URI_GITLAB}/api/v4/users`, {
			params: { username: username },
			headers: { "Private-Token": process.env.GITLAB_TOKEN },
		});

		if (response.data.length > 0) {
			return response.data[0].id;
		} else {
			throw new Error("Usuario no encontrado");
		}
	} catch (error) {
		console.error("Error buscando ID de usuario:", error.message);
		throw error;
	}
}
async function obtenerIdProyectoPorNombre(nombreProyecto) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/projects`,
			{
				params: {
					search: nombreProyecto,
					simple: true,
				},
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		const proyecto = response.data.find(
			(p) => p.name === nombreProyecto || p.path === nombreProyecto,
		);

		if (proyecto) {
			console.log(`Proyecto encontrado: ${proyecto.name} (ID: ${proyecto.id})`);
			return proyecto.id;
		} else {
			console.warn(
				`No se encontró ningún proyecto con el nombre: ${nombreProyecto}`,
			);
			return null;
		}
	} catch (error) {
		console.error(
			"Error al buscar el ID del proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function anadirUsuarioAlProyecto(
	projectId,
	userId,
	accessLevel = 30,
) {
	try {
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/members`,
			{
				user_id: userId,
				access_level: accessLevel,
			},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);
		return response.data;
	} catch (error) {
		// Si el usuario ya es miembro, GitLab devuelve un 409 Conflict
		if (error.response && error.response.status === 409) {
			console.warn("El usuario ya es miembro de este proyecto.");
			return error.response.data;
		}

		console.error(
			"Error al añadir usuario al proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function crearProyecto(nombreProyecto, arrayIdsGitlabBaseDatos) {
	try {
		const safePath = nombreProyecto
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^\w-]/g, "");

		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/projects`,
			{
				name: nombreProyecto,
				path: safePath,
				initialize_with_readme: true,
			},
			{ headers: { "Private-Token": process.env.GITLAB_TOKEN } },
		);

		const projectId = response.data.id;
		console.log(`Proyecto creado en GitLab con ID: ${projectId}`);

		for (const userId of arrayIdsGitlabBaseDatos) {
			await anadirUsuarioAlProyecto(projectId, userId, 30);
		}
		return projectId;
	} catch (error) {
		if (error.response && error.response.data) {
			console.error(
				"Detalle del error 400 de GitLab:",
				JSON.stringify(error.response.data),
			);
		} else {
			console.error("Error de conexión o desconocido:", error.message);
		}
		throw error;
	}
}

export async function eliminarUsuarioDelProyecto(projectId, userId) {
	try {
		const response = await axios.delete(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/members/${userId}`,
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);
		return { success: true, status: response.status };
	} catch (error) {
		if (error.response) {
			if (error.response.status === 404) {
				console.warn(
					`El usuario ${userId} no se encontró como miembro del proyecto ${projectId}.`,
				);
				return {
					success: false,
					message: "El usuario no pertenece al proyecto",
				};
			}
		}
		console.error(
			"Error al eliminar el usuario del proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function archivarProyecto(nombreProyecto) {
	try {
		const proyectId = await obtenerIdProyectoPorNombre(nombreProyecto);
		if (!projectId) {
			return 2; //404 proyecto no encontrado.
		}
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/archive`,
			{},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(`Proyecto ${projectId} archivado con éxito.`);
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(`No se encontró el proyecto con ID ${projectId}.`);
			return 2;
		}

		console.error(
			"Error al archivar el proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function obtenerUsernamePorId(userId) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/users/${userId}`,
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		if (response.data && response.data.username) {
			// console.log(
			// 	`ID ${userId} corresponde al usuario: ${response.data.username}`,
			// );
			return response.data.username;
		} else {
			throw new Error("Usuario no encontrado en la respuesta de GitLab");
		}
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(`El ID de usuario ${userId} no existe en GitLab.`);
			return null;
		}

		console.error(
			"Error al obtener username por ID:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function crearUsuarioGitlab(email, username, name, password) {
	try {
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/users`,
			{
				email,
				username,
				name,
				password,
				skip_confirmation: true,
				admin: false,
			},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(
			`Usuario creado en GitLab: @${username} (ID: ${response.data.id})`,
		);
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 409) {
			console.error("Error: El email o el username ya existen en GitLab.");
			throw new Error("Usuario o email ya registrado en GitLab.");
		}

		console.error(
			"Error al crear usuario en GitLab:",
			error.response?.data || error.message,
		);
		throw error;
	}
}
