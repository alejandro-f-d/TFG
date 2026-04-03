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
				initialize_with_readme: true, // Esto crea la rama 'main'
			},
			{ headers: { "Private-Token": process.env.GITLAB_TOKEN } },
		);

		const projectId = response.data.id;
		console.log(`Proyecto creado en GitLab con ID: ${projectId}`);

		try {
			await axios.delete(
				`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/protected_branches/main`,
				{ headers: { "Private-Token": process.env.GITLAB_TOKEN } },
			);
			console.log(
				`Protección de la rama 'main' eliminada para el proyecto ${projectId}`,
			);
		} catch (protError) {
			console.warn(
				"No se pudo desproteger 'main' (quizás aún se está creando el repo).",
				protError.message,
			);
		}

		//Añadir a los usuarios.
		for (const userId of arrayIdsGitlabBaseDatos) {
			await anadirUsuarioAlProyecto(projectId, userId, 30);
		}

		return projectId;
	} catch (error) {
		if (error.response && error.response.data) {
			console.error(
				"Detalle del error de GitLab:",
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

export async function archivarProyecto(projectId) {
	try {
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

export async function obtenerDetallesProyecto(proyecto) {
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/projects/${proyecto}`,
			{
				params: {
					statistics: true,
					license: true,
				},
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(`Datos obtenidos para el proyecto: ${response.data.name}`);
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(`El proyecto con ID ${projectId} no existe en GitLab.`);
			return null;
		}

		console.error(
			"Error al obtener detalles del proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function obtenerEstadisticasCommits(projectId, desdeFecha = null) {
	try {
		const params = {
			per_page: 100,
			all: true,
		};

		if (desdeFecha) {
			params.since = desdeFecha;
		}

		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/repository/commits`,
			{
				params,
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		const fechasCommits = response.data.map((commit) => ({
			id: commit.id,
			fecha: commit.created_at,
			autor: commit.author_name,
		}));

		return fechasCommits;
	} catch (error) {
		console.error(
			"Error al obtener commits:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function actualizarUsernameGitlab(idGitlab, nuevoUsername) {
	try {
		//Preprocesado del nombre de usuario.
		const usernameLimpio = nuevoUsername
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^\w-]/g, "");

		const response = await axios.put(
			`${process.env.URI_GITLAB}/api/v4/users/${idGitlab}`,
			{
				username: usernameLimpio,
			},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(
			`Username actualizado con éxito: ID ${idGitlab} ahora es @${usernameLimpio}`,
		);
		return response.data;
	} catch (error) {
		if (error.response) {
			// Error 409: El username ya está en uso
			if (error.response.status === 409) {
				console.error("Error: El nuevo username ya está en uso.");
				throw new Error("El nombre de usuario ya existe en GitLab.");
			}
			// Error 404: El ID no existe
			if (error.response.status === 404) {
				console.error(`No se encontró al usuario con ID: ${idGitlab}`);
				throw new Error("Usuario no encontrado en GitLab.");
			}
		}

		console.error(
			"Error al editar username:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function desarchivarProyecto(projectId) {
	try {
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/unarchive`,
			{},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(`Proyecto ${projectId} desarchivado con éxito.`);
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(`No se encontró el proyecto con ID ${projectId}.`);
			return 2;
		}

		console.error(
			"Error al desarchivar el proyecto:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function sincronizarParticipantesGitlab(projectId, idsDeseados) {
	const ROOT_ID = process.env.ROOT_ID;

	console.log("El id del repo es:", projectId);
	try {
		const response = await axios.get(
			`${process.env.URI_GITLAB}/api/v4/projects/${projectId}/members`,
			{ headers: { "Private-Token": process.env.GITLAB_TOKEN } },
		);

		const miembrosActuales = response.data.map((m) => m.id);

		const paraEliminar = miembrosActuales.filter(
			(id) => !idsDeseados.includes(id) && id !== ROOT_ID,
		);

		const paraAnadir = idsDeseados.filter(
			(id) => !miembrosActuales.includes(id) && id !== ROOT_ID,
		);

		console.log(
			`[SYNC] Proyecto ${projectId}: Eliminando ${paraEliminar.length}, Añadiendo ${paraAnadir.length}`,
		);

		for (const userId of paraEliminar) {
			try {
				await eliminarUsuarioDelProyecto(projectId, userId);
			} catch (err) {
				console.error(`Error al eliminar usuario ${userId}:`, err.message);
			}
		}

		for (const userId of paraAnadir) {
			try {
				await anadirUsuarioAlProyecto(projectId, userId, 30);
			} catch (err) {
				console.error(`Error al añadir usuario ${userId}:`, err.message);
			}
		}

		return {
			status: "Sincronización completada",
			rootProtegido: true,
			cambios: { eliminados: paraEliminar, anadidos: paraAnadir },
		};
	} catch (error) {
		console.error("Fallo crítico en sincronización:", error.message);
		throw error;
	}
}

export async function bloquearUsuarioGitlab(userId) {
	try {
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/users/${userId}/block`,
			{},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(`[!] Usuario ID ${userId} ha sido BLOQUEADO (Baja técnica).`);
		return { success: true, message: "Cuenta desactivada correctamente" };
	} catch (error) {
		console.error(
			"Error al bloquear usuario:",
			error.response?.data || error.message,
		);
		throw error;
	}
}

export async function reactivarUsuarioGitlab(userId) {
	try {
		const response = await axios.post(
			`${process.env.URI_GITLAB}/api/v4/users/${userId}/unblock`,
			{},
			{
				headers: { "Private-Token": process.env.GITLAB_TOKEN },
			},
		);

		console.log(`[+] Usuario ID ${userId} ha sido REACTIVADO con éxito.`);

		return {
			success: true,
			message: "Acceso restaurado correctamente",
			usuario: response.data,
		};
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(`Error: El usuario con ID ${userId} no existe.`);
			throw new Error("Usuario no encontrado en GitLab.");
		}

		console.error(
			"Error al reactivar usuario:",
			error.response?.data || error.message,
		);
		throw error;
	}
}
