import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { GITLAB_QUERYS } from "../querys/gitlabQuerys.js";
import {
	obtenerTodosLosProyectosUser,
	getAllProjectMembers,
} from "../integrations/gitlab.js";
class GitlabModel {
	static async getAllUsuariosActivos() {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_ALL_USUARIOS_ACTIVOS);
			const usuariosMap = new Map();
			result.rows.forEach((row) => {
				usuariosMap.set(row.gitlab, row.idusuario);
			});
			return usuariosMap;
		} catch (error) {
			console.error("Error al obtener usuarios activos:", error);
			throw error;
		}
	}

	static async getAllProyectos() {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_ALL_PROYECTOS);
			const proyectosMap = new Map();
			result.rows.forEach((row) => {
				proyectosMap.set(row.idgitlab, row.idproyecto);
			});
			return proyectosMap;
		} catch (error) {
			console.error("Error al obtener proyectos:", error);
			throw error;
		}
	}

	static async getProyectoByIdGitlab(idGitlab) {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_PROYECTO_BY_ID_GITLAB, [
				idGitlab,
			]);
			return result.rows[0] || null;
		} catch (error) {
			console.error(`Error al obtener proyecto ${idGitlab}:`, error);
			throw error;
		}
	}

	static async createProyecto({
		idGitlab,
		nombre,
		descripcion,
		fechaInicio,
		archived,
		idGrupoGitlab,
	}) {
		const uuidProyecto = uuidv4();
		const activo = !archived;

		try {
			const result = await pool.query(GITLAB_QUERYS.ALTA_PROYECTO, [
				nombre,
				descripcion,
				uuidProyecto,
				fechaInicio,
				idGitlab,
				activo,
				idGrupoGitlab,
			]);
			return result.rows[0].idproyecto;
		} catch (error) {
			console.error(`Error al crear proyecto ${nombre}:`, error);
			throw error;
		}
	}

	static async updateProyectoGrupo(idProyecto, idGrupoGitlab) {
		try {
			await pool.query(GITLAB_QUERYS.UPDATE_PROYECTO_GRUPO, [
				idGrupoGitlab,
				idProyecto,
			]);
		} catch (error) {
			console.error(
				`Error al actualizar grupo del proyecto ${idProyecto}:`,
				error,
			);
			throw error;
		}
	}

	static async updateProyectoActivo(idProyecto, archived) {
		const activo = !archived;
		try {
			await pool.query(GITLAB_QUERYS.UPDATE_PROYECTO_ACTIVO, [
				activo,
				idProyecto,
			]);
		} catch (error) {
			console.error(
				`Error al actualizar estado del proyecto ${idProyecto}:`,
				error,
			);
			throw error;
		}
	}

	static async getMiembrosByProyecto(idProyecto) {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_MIEMBROS_BY_PROYECTO, [
				idProyecto,
			]);
			const miembrosSet = new Set();
			result.rows.forEach((row) => {
				miembrosSet.add(row.idusuario);
			});
			return miembrosSet;
		} catch (error) {
			console.error(
				`Error al obtener miembros del proyecto ${idProyecto}:`,
				error,
			);
			throw error;
		}
	}

	static async upsertParticipa(idUsuario, idProyecto, rol) {
		try {
			await pool.query(GITLAB_QUERYS.ALTA_PARTICIPA, [
				idUsuario,
				idProyecto,
				rol,
			]);
		} catch (error) {
			console.error(
				`Error al añadir usuario ${idUsuario} al proyecto ${idProyecto}:`,
				error,
			);
			throw error;
		}
	}

	static async deleteParticipa(idUsuario, idProyecto) {
		try {
			await pool.query(GITLAB_QUERYS.DELETE_PARTICIPA, [idUsuario, idProyecto]);
		} catch (error) {
			console.error(
				`Error al eliminar usuario ${idUsuario} del proyecto ${idProyecto}:`,
				error,
			);
			throw error;
		}
	}

	static mapAccessLevelToRole(accessLevel) {
		const roles = {
			0: "No Access",
			5: "Minimal Access",
			10: "Guest",
			20: "Reporter",
			30: "Developer",
			40: "Maintainer",
			50: "Owner",
		};
		return roles[accessLevel] || "Developer";
	}

	static async getLocalProjectIdByGitlabId(gitlabProjectId) {
		try {
			const result = await pool.query(
				"SELECT idProyecto FROM medal.proyectosGitlab WHERE idGitlab = $1",
				[gitlabProjectId],
			);
			return result.rows[0]?.idproyecto || null;
		} catch (error) {
			console.error(
				`Error al obtener proyecto local ${gitlabProjectId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Sincroniza proyectos y membresías de GitLab:
	 * - A partir de usuarios activos locales (proyectos individuales y de grupos)
	 * - A partir de grupos de GitLab a los que pertenecen esos usuarios
	 *
	 * Escenarios:
	 * 1. Todo ya existe → actualiza datos y membresías.
	 * 2. Proyecto existe pero no sus relaciones → añade/elimina miembros en 'participa'.
	 * 3. Proyecto no existe → lo crea con sus relaciones.
	 *
	 * @returns {Promise<{ created: number, updated: number, membershipChanges: number }>}
	 */
	static async syncAllProjectsFromUsers() {
		// 1. Usuarios locales activos con gitlabId
		const usuariosMap = await this.getAllUsuariosActivos(); // <gitlabId, localUserId>
		if (usuariosMap.size === 0) {
			console.log("No hay usuarios activos con gitlabId para sincronizar.");
			return { created: 0, updated: 0, membershipChanges: 0 };
		}

		// 2. Proyectos locales existentes
		const proyectosLocalesMap = await this.getAllProyectos(); // <gitlabId, localProjectId>
		const seenGitlabProjectIds = new Set();

		let createdCount = 0;
		let updatedCount = 0;
		let membershipChangesCount = 0;

		// Conjunto para almacenar IDs de grupos que hay que procesar
		const groupIdsToProcess = new Set();

		// -------------------------------
		// FASE 1: Proyectos de usuarios
		// -------------------------------
		for (const [gitlabUserId, localUserId] of usuariosMap.entries()) {
			console.log(
				`[Usuario] GitLab ID: ${gitlabUserId} → local: ${localUserId}`,
			);

			let gitlabProjects = [];
			try {
				gitlabProjects = await obtenerTodosLosProyectosUser(gitlabUserId);
			} catch (err) {
				console.error(
					`Error obteniendo proyectos del usuario ${gitlabUserId}:`,
					err.message,
				);
				continue;
			}

			for (const gitlabProj of gitlabProjects) {
				const gitlabProjectId = gitlabProj.id;
				seenGitlabProjectIds.add(gitlabProjectId);

				// Registrar grupos de los proyectos (namespace tipo grupo)
				if (gitlabProj.namespace?.kind === "group") {
					groupIdsToProcess.add(gitlabProj.namespace.id);
				}

				await this._syncSingleProject(
					gitlabProj,
					proyectosLocalesMap,
					usuariosMap,
					{
						createdCount,
						updatedCount,
						membershipChangesCount,
					},
				);
				// Actualizar contadores (como se pasa por referencia, se modifica dentro)
			}
		}

		// -------------------------------
		// FASE 2: Proyectos de grupos (obtenidos de los usuarios o directamente)
		// -------------------------------
		// También podemos agregar grupos de los que el usuario es miembro directamente
		for (const [gitlabUserId] of usuariosMap.entries()) {
			try {
				const userGroups = await getUserGroups(gitlabUserId);
				for (const gid of userGroups) groupIdsToProcess.add(gid);
			} catch (err) {
				console.error(
					`Error obteniendo grupos del usuario ${gitlabUserId}:`,
					err.message,
				);
			}
		}

		console.log(`Grupos a procesar: ${[...groupIdsToProcess].join(", ")}`);

		for (const groupId of groupIdsToProcess) {
			let groupProjects = [];
			try {
				groupProjects = await getAllGroupProjects(groupId);
			} catch (err) {
				console.error(
					`Error obteniendo proyectos del grupo ${groupId}:`,
					err.message,
				);
				continue;
			}

			for (const gitlabProj of groupProjects) {
				const gitlabProjectId = gitlabProj.id;
				if (seenGitlabProjectIds.has(gitlabProjectId)) continue; // ya procesado

				seenGitlabProjectIds.add(gitlabProjectId);

				await this._syncSingleProject(
					gitlabProj,
					proyectosLocalesMap,
					usuariosMap,
					{
						createdCount,
						updatedCount,
						membershipChangesCount,
					},
				);
			}
		}

		// (Opcional) Desactivar proyectos locales que ya no existen en GitLab
		// for (const [gitlabId, localId] of proyectosLocalesMap.entries()) {
		//   if (!seenGitlabProjectIds.has(gitlabId)) {
		//     await this.updateProyectoActivo(localId, true); // archived=true -> activo=false
		//     updatedCount++;
		//   }
		// }

		return {
			created: createdCount,
			updated: updatedCount,
			membershipChanges: membershipChangesCount,
		};
	}

	/**
	 * Sincroniza un único proyecto (crea/actualiza y sus miembros)
	 * @private
	 */
	static async _syncSingleProject(
		gitlabProj,
		proyectosLocalesMap,
		usuariosMap,
		counters,
	) {
		const gitlabProjectId = gitlabProj.id;

		let idGrupoGitlab = null;
		if (gitlabProj.namespace?.kind === "group") {
			idGrupoGitlab = gitlabProj.namespace.id;
		}

		const fechaInicio = gitlabProj.created_at
			? gitlabProj.created_at.split("T")[0]
			: new Date().toISOString().split("T")[0];
		const archived = gitlabProj.archived || false;

		let localProjectId = proyectosLocalesMap.get(gitlabProjectId);

		if (!localProjectId) {
			// CREAR NUEVO PROYECTO
			try {
				localProjectId = await this.createProyecto({
					idGitlab: gitlabProjectId,
					nombre: gitlabProj.name,
					descripcion: gitlabProj.description || "",
					fechaInicio,
					archived,
					idGrupoGitlab,
				});
				counters.createdCount++;
				console.log(
					`[Creado] ${gitlabProj.name} (idGitLab ${gitlabProjectId})`,
				);
				proyectosLocalesMap.set(gitlabProjectId, localProjectId);
			} catch (err) {
				console.error(
					`Error creando proyecto ${gitlabProj.name}:`,
					err.message,
				);
				return;
			}
		} else {
			// ACTUALIZAR SI ES NECESARIO (grupo, activo)
			let needsUpdate = false;
			const existing = await this.getProyectoByIdGitlab(gitlabProjectId);
			if (existing) {
				if (existing.idgrupo_gitlab !== idGrupoGitlab) {
					await this.updateProyectoGrupo(localProjectId, idGrupoGitlab);
					needsUpdate = true;
				}
				const activo = !archived;
				if (existing.activo !== activo) {
					await this.updateProyectoActivo(localProjectId, archived);
					needsUpdate = true;
				}
			}
			if (needsUpdate) {
				counters.updatedCount++;
				console.log(
					`[Actualizado] ${gitlabProj.name} (idGitLab ${gitlabProjectId})`,
				);
			}
		}

		// SINCRONIZAR MIEMBROS
		let gitlabMembers = [];
		try {
			gitlabMembers = await getAllProjectMembers(gitlabProjectId);
		} catch (err) {
			console.error(
				`Error obteniendo miembros del proyecto ${gitlabProjectId}:`,
				err.message,
			);
			return;
		}

		const localMemberIds = await this.getMiembrosByProyecto(localProjectId);
		const expectedLocalMemberIds = new Set();

		for (const member of gitlabMembers) {
			const memberGitlabId = member.id;
			const localUserId = usuariosMap.get(memberGitlabId);
			if (localUserId) {
				expectedLocalMemberIds.add(localUserId);
				const role = this.mapAccessLevelToRole(member.access_level);
				try {
					await this.upsertParticipa(localUserId, localProjectId, role);
					counters.membershipChangesCount++;
				} catch (err) {
					console.error(
						`Error upsert participa (u${localUserId}, p${localProjectId}):`,
						err.message,
					);
				}
			} else {
				console.debug(
					`Miembro GitLab ${memberGitlabId} no encontrado localmente, omitido.`,
				);
			}
		}

		for (const localMemberId of localMemberIds) {
			if (!expectedLocalMemberIds.has(localMemberId)) {
				try {
					await this.deleteParticipa(localMemberId, localProjectId);
					counters.membershipChangesCount++;
				} catch (err) {
					console.error(
						`Error delete participa (u${localMemberId}, p${localProjectId}):`,
						err.message,
					);
				}
			}
		}
	}
}

export default GitlabModel;
