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
	 * Sincroniza todos los proyectos y membresías de GitLab a partir de los usuarios activos locales.
	 * Escenarios:
	 * 1. Proyecto ya existe localmente y sus relaciones también → se actualizan datos (grupo, activo) y membresías.
	 * 2. Proyecto existe pero faltan relaciones → se añaden/eliminan los miembros en 'participa'.
	 * 3. Proyecto no existe → se crea el proyecto y sus relaciones.
	 *
	 * @returns {Promise<{ created: number, updated: number, membershipChanges: number }>}
	 */
	static async syncAllProjectsFromUsers() {
		// 1. Obtener usuarios locales activos con gitlabId
		const usuariosMap = await this.getAllUsuariosActivos(); // Map<gitlabId, localUserId>
		if (usuariosMap.size === 0) {
			console.log("No hay usuarios activos con gitlabId para sincronizar.");
			return { created: 0, updated: 0, membershipChanges: 0 };
		}
		console.log(`Mapeo de todos los usuarios: ${usuariosMap}`);

		// 2. Obtener todos los proyectos locales existentes (Map<gitlabId, localProjectId>)
		const proyectosLocalesMap = await this.getAllProyectos();

		// Conjunto para registrar qué proyectos de GitLab vemos durante la sincronización
		const seenGitlabProjectIds = new Set();

		let createdCount = 0;
		let updatedCount = 0;
		let membershipChangesCount = 0;

		// 3. Iterar cada usuario local con gitlabId
		for (const [gitlabUserId, localUserId] of usuariosMap.entries()) {
			console.log(
				`Sincronizando proyectos para usuario GitLab ID: ${gitlabUserId} (local: ${localUserId})`,
			);

			let gitlabProjects = [];
			try {
				gitlabProjects = await obtenerTodosLosProyectosUser(gitlabUserId);
			} catch (error) {
				console.error(
					`Error obteniendo proyectos del usuario ${gitlabUserId}:`,
					error.message,
				);
				continue;
			}

			for (const gitlabProj of gitlabProjects) {
				const gitlabProjectId = gitlabProj.id;
				seenGitlabProjectIds.add(gitlabProjectId);

				// Determinar idGrupoGitlab: si el namespace es un grupo, tomar su id
				let idGrupoGitlab = null;
				if (gitlabProj.namespace && gitlabProj.namespace.kind === "group") {
					idGrupoGitlab = gitlabProj.namespace.id;
				}

				const fechaInicio = gitlabProj.created_at
					? gitlabProj.created_at.split("T")[0]
					: new Date().toISOString().split("T")[0];
				const archived = gitlabProj.archived || false;

				let localProjectId = proyectosLocalesMap.get(gitlabProjectId);

				if (!localProjectId) {
					// Escenario 3: No existe → crear proyecto
					try {
						localProjectId = await this.createProyecto({
							idGitlab: gitlabProjectId,
							nombre: gitlabProj.name,
							descripcion: gitlabProj.description || "",
							fechaInicio,
							archived,
							idGrupoGitlab,
						});
						createdCount++;
						console.log(
							`Proyecto creado: ${gitlabProj.name} (ID GitLab: ${gitlabProjectId})`,
						);
						proyectosLocalesMap.set(gitlabProjectId, localProjectId);
					} catch (err) {
						console.error(
							`Error creando proyecto ${gitlabProj.name}:`,
							err.message,
						);
						continue;
					}
				} else {
					// Escenario 1 o 2: Proyecto existe → actualizar datos si es necesario
					let needsUpdate = false;
					const existingProj =
						await this.getProyectoByIdGitlab(gitlabProjectId);
					if (existingProj) {
						if (existingProj.idgrupo_gitlab !== idGrupoGitlab) {
							await this.updateProyectoGrupo(localProjectId, idGrupoGitlab);
							needsUpdate = true;
						}
						const activo = !archived;
						if (existingProj.activo !== activo) {
							await this.updateProyectoActivo(localProjectId, archived);
							needsUpdate = true;
						}
					}
					if (needsUpdate) {
						updatedCount++;
						console.log(
							`Proyecto actualizado: ${gitlabProj.name} (ID GitLab: ${gitlabProjectId})`,
						);
					}
				}

				// 4. Sincronizar miembros (tabla participa)
				let gitlabMembers = [];
				try {
					gitlabMembers = await getAllProjectMembers(gitlabProjectId);
				} catch (err) {
					console.error(
						`Error obteniendo miembros del proyecto ${gitlabProjectId}:`,
						err.message,
					);
					continue;
				}

				const localMemberIds = await this.getMiembrosByProyecto(localProjectId);
				const expectedLocalMemberIds = new Set();

				for (const member of gitlabMembers) {
					const memberGitlabId = member.id;
					const localUserIdForMember = usuariosMap.get(memberGitlabId);
					if (localUserIdForMember) {
						expectedLocalMemberIds.add(localUserIdForMember);
						const role = this.mapAccessLevelToRole(member.access_level);
						try {
							await this.upsertParticipa(
								localUserIdForMember,
								localProjectId,
								role,
							);
							membershipChangesCount++;
						} catch (err) {
							console.error(
								`Error al upsert participa (user ${localUserIdForMember}, proj ${localProjectId}):`,
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
							membershipChangesCount++;
						} catch (err) {
							console.error(
								`Error al eliminar participa (user ${localMemberId}, proj ${localProjectId}):`,
								err.message,
							);
						}
					}
				}
			}
		}

		return {
			created: createdCount,
			updated: updatedCount,
			membershipChanges: membershipChangesCount,
		};
	}
}

export default GitlabModel;
